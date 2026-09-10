# Terrain L1 — отчёт загрузки в LOCAL R2

Статус: **complete**. Отдельный reconcile после upload: `verifiedAll=true`, `resumeRequired=false`, неожиданных объектов нет.

Manifest URL: http://localhost:3000/terrain/eastern_europe_test/L1/manifest.json

Bundle ID: `9504d9a8b32ef27fecd4380de745f7690e7b19e252978e1e424af8a4b74aced9`

Загружены 9 тайлов (38 635 496 байт), manifest (11 174 байта) и metadata `_bundle.json` в `terrain/eastern_europe_test/L1/`. Metadata перечитана: состояние complete. Данные D1 не изменялись.

## Проверка повторным чтением

| Объект | Размер, байт | MIME | SHA-256 | Итог |
|---|---:|---|---|---|
| manifest.json | 11174 | application/json | `9504d9a8b32ef27fecd4380de745f7690e7b19e252978e1e424af8a4b74aced9` | verified |
| 0_0.glb | 4369984 | model/gltf-binary | `ec096e0b3a23eb52e8ac933e0b54e080c8db872c2b2c5548d39bf472fbc7b926` | verified |
| 1_0.glb | 4131156 | model/gltf-binary | `a9ceb39e0207e6f21bb4390cb7cd14b97f536e618c251bb86fb7a3b571aa431c` | verified |
| 2_0.glb | 4406120 | model/gltf-binary | `f7ec1084876249e602e7351c38ed81facde67b1123ee1d78689d24fefd0de6ad` | verified |
| 0_1.glb | 5085004 | model/gltf-binary | `a4dfee7c13abc67781676201d73702c64584e364c8644c4a04742601b58bd8ef` | verified |
| 1_1.glb | 4620980 | model/gltf-binary | `307dcdac564a7417ff08bb21fa05d00755a9411be18d76e005e42f65f8415e3b` | verified |
| 2_1.glb | 4737000 | model/gltf-binary | `33e69c920a57e89c222e3fb47c500845e92d089147ed3c76d2078d38c0f1930c` | verified |
| 0_2.glb | 5608780 | model/gltf-binary | `14e0d62a0d1ada71728e4d56afb62c7577da946d27c93e046c3ca32c78d6ae1f` | verified |
| 1_2.glb | 2260624 | model/gltf-binary | `6064528bf51c0016013979917b05862fd52e6b6e0145f2adc084a452f298f31a` | verified |
| 2_2.glb | 3415848 | model/gltf-binary | `8adffb12af5ae4cec254ef48bad1112b106bdc997bfe4bb7e029d9346431a8d4` | verified |

HTTP manifest: `{"url": "http://localhost:3000/terrain/eastern_europe_test/L1/manifest.json", "status": 200, "size": 11174, "mime": "application/json", "sha256": "9504d9a8b32ef27fecd4380de745f7690e7b19e252978e1e424af8a4b74aced9"}`

Base Earth до/после совпадает: `true`. Production не затронута. Публикации, commit, push, deploy и удаления не выполнялись. Это загрузка bundle; terrain renderer не подключался.
