import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  unlinkSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Terrain } from "../src/terrain.mjs";
import { Store } from "../src/store.mjs";
import { AdminApi } from "../src/transport.mjs";
import { validateTerrainFiles, sha256 } from "../src/terrain-validation.mjs";
import { glb } from "./helpers/visualizer.mjs";
const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "terrain-test-")),
    dir = join(root, "bundle");
  // Bundle directory contains precisely its manifest/GLB files; state is outside it.
  mkdirSync(dir);
  const bytes = glb();
  const tile = (x) => ({
    tile_id: `l1_${x}_0`,
    lod: 1,
    x,
    y: 0,
    min_lat: 41,
    max_lat: 45,
    min_lon: 20 + x * 8,
    max_lon: 28 + x * 8,
    world_position: [0, 0, 0],
    world_scale: [1, 1, 1],
    file: `tile_${x}.glb`,
    file_size_bytes: bytes.length,
    sha256: sha256(bytes),
  });
  const manifest = {
    region: "local-test",
    bounds: { minLon: 20, minLat: 41, maxLon: 36, maxLat: 45 },
    grid: {
      lod: 1,
      countX: 2,
      countY: 1,
      baseCountX: 2,
      baseCountY: 1,
      xDirection: "east",
      yDirection: "south",
    },
    coordinateSystem: {
      east: "+X",
      north: "-Z",
      up: "+Y",
      projection: "spherical AEQD + spherical sag",
      origin: { latitude: 43, longitude: 28 },
      metersPerUnit: 100000,
      earthRadiusMeters: 6371000,
      heightExaggeration: 14,
      vertexCoordinates:
        "baked regional coordinates; identity object transforms, no independent tile recentering",
    },
    tiles: [tile(0), tile(1)],
    total_glb_bytes: bytes.length * 2,
  };
  const path = join(dir, "terrain_manifest.json");
  const save = () => writeFileSync(path, JSON.stringify(manifest));
  save();
  for (const t of manifest.tiles) writeFileSync(join(dir, t.file), bytes);
  const store = new Store(join(root, "state"), "http://localhost:3000");
  const objects = new Map();
  const writes = [];
  let remote = null,
    complete = false,
    failTile = false,
    wrongHash = false;
  const api = {
    config: { origin: "http://localhost:3000", environment: "local" },
    async terrainRequest(path, { method = "GET", body, bundleId } = {}) {
      const prefix = "terrain/local-test/L1/";
      const status = () => ({
        bundleId: remote ? sha256(Buffer.from(JSON.stringify(remote))) : null,
        state: complete ? "complete" : remote ? "staging" : "absent",
        complete,
        verifiedAll: !!remote && objects.size === 3,
        unexpected: [],
        objects: remote
          ? [
              {
                key: prefix + "manifest.json",
                size: Buffer.byteLength(JSON.stringify(remote)),
                sha256: sha256(Buffer.from(JSON.stringify(remote))),
                mimeType: "application/json",
              },
              ...remote.tiles.map((t) => ({
                key: prefix + t.file,
                size: t.file_size_bytes,
                sha256: t.sha256,
                mimeType: "model/gltf-binary",
              })),
            ].map((o) => ({
              ...o,
              status: objects.has(o.key) ? "verified" : "missing",
              ...(objects.has(o.key)
                ? { actualHash: wrongHash ? "0".repeat(64) : sha256(objects.get(o.key)) }
                : {}),
            }))
          : [],
      });
      if (method === "GET") return status();
      writes.push(path);
      if (path.endsWith("/reconcile")) {
        complete = objects.size === 3;
        return status();
      }
      if (path.includes("/tiles/")) {
        const name = path.split("/").pop() + ".glb";
        objects.set(prefix + name, Buffer.from(body));
        if (failTile) {
          failTile = false;
          throw new Error("lost tile response");
        }
        return status().objects.find((o) => o.key === prefix + name);
      }
      remote = JSON.parse(Buffer.from(body));
      objects.set(prefix + "manifest.json", Buffer.from(body));
      return status();
    },
  };
  const op = new Terrain(api, store, { uploadRoots: [root] });
  cleanups.push(() => {
    store.close();
    rmSync(root, { recursive: true, force: true });
  });
  return {
    root,
    dir,
    path,
    manifest,
    save,
    store,
    api,
    op,
    objects,
    writes,
    fail() {
      failTile = true;
    },
    badHash() {
      wrongHash = true;
    },
  };
}
test("validation creates a precise local receipt and performs zero API writes", async () => {
  const s = fixture();
  const r = await s.op.validate({ manifestPath: s.path });
  assert.equal(r.valid, true);
  assert.equal(r.tileCount, 2);
  assert.match(r.manifestKey, /terrain\/local-test\/L1\/manifest.json/);
  assert.deepEqual(
    r.files.map((t) => t.r2Key),
    ["terrain/local-test/L1/0_0.glb", "terrain/local-test/L1/1_0.glb"],
  );
  assert.equal(s.writes.length, 0);
});
test("validation rejects missing/extra files and SHA/size/MIME mismatches", async () => {
  for (const mutate of [
    (s) => unlinkSync(join(s.dir, "tile_1.glb")),
    (s) => writeFileSync(join(s.dir, "unlisted.glb"), glb()),
    (s) => {
      s.manifest.tiles[0].sha256 = "0".repeat(64);
      s.save();
    },
    (s) => {
      s.manifest.tiles[0].file_size_bytes++;
      s.save();
    },
    (s) => {
      s.manifest.tiles[0].mimeType = "image/png";
      s.save();
    },
    (s) => writeFileSync(join(s.dir, "tile_0.glb"), Buffer.alloc(glb().length)),
  ]) {
    const s = fixture();
    mutate(s);
    assert.equal((await s.op.validate({ manifestPath: s.path })).valid, false);
    assert.equal(s.writes.length, 0);
  }
});
test("grid contract rejects duplicate IDs, duplicate x/y, holes, invalid LOD/bounds/axes/path traversal", async () => {
  for (const mutate of [
    (m) => (m.tiles[1].tile_id = m.tiles[0].tile_id),
    (m) => (m.tiles[1].x = 0),
    (m) => m.tiles.pop(),
    (m) => (m.grid.lod = 4),
    (m) => (m.tiles[0].lod = 2),
    (m) => (m.bounds.minLat = 95),
    (m) => (m.tiles[0].min_lon = 21),
    (m) => (m.coordinateSystem.north = "+Z"),
    (m) => (m.tiles[0].file = "../escape.glb"),
    (m) => (m.tiles[0].world_position = [1, 0, 0]),
  ]) {
    const s = fixture();
    mutate(s.manifest);
    s.save();
    assert.equal((await s.op.validate({ manifestPath: s.path })).valid, false);
  }
});
test("external symlink cannot escape bundle root", async () => {
  const s = fixture();
  unlinkSync(join(s.dir, "tile_0.glb"));
  const outside = join(s.root, "outside.glb");
  writeFileSync(outside, glb());
  symlinkSync(outside, join(s.dir, "tile_0.glb"));
  assert.equal((await s.op.validate({ manifestPath: s.path })).valid, false);
});
test("upload requires exact confirmation and revalidates ALL files before any write", async () => {
  const s = fixture(),
    r = await s.op.validate({ manifestPath: s.path });
  await assert.rejects(
    s.op.upload({ validationId: r.validationId, confirmation: "yes" }),
    /confirmation/,
  );
  assert.equal(s.writes.length, 0);
  writeFileSync(join(s.dir, "tile_1.glb"), Buffer.alloc(glb().length));
  await assert.rejects(
    s.op.upload({ validationId: r.validationId, confirmation: r.confirmation }),
    /mismatch|GLB/,
  );
  assert.equal(s.writes.length, 0);
});
test("upload follows manifest/tiles/reconcile and returns complete only after readback", async () => {
  const s = fixture(),
    r = await s.op.validate({ manifestPath: s.path });
  const result = await s.op.upload({ validationId: r.validationId, confirmation: r.confirmation });
  assert.equal(result.complete, true);
  assert.equal(s.writes.length, 4);
  assert.ok(s.writes[3].endsWith("/reconcile"));
  assert.equal((await s.op.reconcile({ validationId: r.validationId })).complete, true);
});
test("lost tile response resumes with verified objects skipped, no blind reupload", async () => {
  const s = fixture(),
    r = await s.op.validate({ manifestPath: s.path });
  s.fail();
  await assert.rejects(
    s.op.upload({ validationId: r.validationId, confirmation: r.confirmation }),
    /lost/,
  );
  const read = await s.op.reconcile({ validationId: r.validationId });
  assert.equal(read.complete, false);
  assert.equal(read.approved, true);
  const done = await s.op.resume({ validationId: r.validationId });
  assert.equal(done.complete, true);
  assert.equal(s.writes.filter((p) => p.endsWith("/tiles/0_0")).length, 1);
});
test("resume refuses approval bypass and remote hash conflicts", async () => {
  const s = fixture(),
    r = await s.op.validate({ manifestPath: s.path });
  await assert.rejects(s.op.resume({ validationId: r.validationId }), /approved/);
  s.fail();
  await assert.rejects(s.op.upload({ validationId: r.validationId, confirmation: r.confirmation }));
  s.badHash();
  const count = s.writes.length;
  await assert.rejects(s.op.resume({ validationId: r.validationId }), /SHA-256/);
  assert.equal(s.writes.length, count);
});
test("production and arbitrary route/delete cannot be reached", async () => {
  const s = fixture();
  s.api.config.origin = "https://svetikony.com";
  await assert.rejects(s.op.validate({ manifestPath: s.path }), /LOCAL/);
  const api = new AdminApi(
    { origin: "http://localhost:3000", environment: "local", token: "test" },
    () => {
      throw new Error("must not fetch");
    },
  );
  await assert.rejects(
    api.terrainRequest("/api/admin/terrain-bundles/a/L1", { method: "DELETE" }),
    /Unsupported/,
  );
  await assert.rejects(
    api.terrainRequest("/api/admin/media/upload", { method: "POST" }),
    /Unsupported/,
  );
});
test("terrain leases exclude concurrent clients but recover expired process leases", () => {
  const s = fixture();
  const lease = s.store.claimTerrain("a");
  assert.throws(() => s.store.claimTerrain("b"), /active/);
  s.store.releaseTerrain("a", lease);
  assert.ok(s.store.claimTerrain("b"));
});

test('future L2/L3 subdivisions pass the same grid contract without uploads',async()=>{
 for(const lod of [2,3]){
  const s=fixture(),m=s.manifest,base={...m.tiles[0]};for(const t of m.tiles)unlinkSync(join(s.dir,t.file));
  const scale=2**(lod-1),nx=2*scale,ny=scale;m.grid={...m.grid,lod,countX:nx,countY:ny};m.tiles=[];
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
   const t={...base,tile_id:`l${lod}_${x}_${y}`,lod,x,y,file:`tile_${x}_${y}.glb`,min_lon:20+x*16/nx,max_lon:20+(x+1)*16/nx,min_lat:45-(y+1)*4/ny,max_lat:45-y*4/ny};m.tiles.push(t);writeFileSync(join(s.dir,t.file),glb());
  }
  m.total_glb_bytes=m.tiles.length*glb().length;s.save();const r=await s.op.validate({manifestPath:s.path});assert.equal(r.valid,true);assert.equal(r.lod,`L${lod}`);assert.equal(s.writes.length,0);
 }
});
test('changed manifest invalidates approval before upload',async()=>{const s=fixture(),r=await s.op.validate({manifestPath:s.path});s.manifest.loading='changed';s.save();await assert.rejects(s.op.upload({validationId:r.validationId,confirmation:r.confirmation}),/changed since validation/);assert.equal(s.writes.length,0);});
test('embedded GLB tile metadata must agree with manifest',async()=>{const s=fixture();const bad=glb({asset:{version:'2.0'},nodes:[{extras:{tile_id:'wrong'}}]});writeFileSync(join(s.dir,'tile_0.glb'),bad);s.manifest.tiles[0].sha256=sha256(bad);s.manifest.tiles[0].file_size_bytes=bad.length;s.manifest.total_glb_bytes=bad.length+glb().length;s.save();assert.equal((await s.op.validate({manifestPath:s.path})).valid,false);});
