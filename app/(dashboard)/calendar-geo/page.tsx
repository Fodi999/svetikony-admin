import {notFound} from 'next/navigation';
import {RequireAccess} from '@/components/layout/require-access';
import {CalendarGeoReview} from './review';
export default function Page(){
  if(process.env.NODE_ENV!=='development')notFound();
  return <RequireAccess area="content"><CalendarGeoReview/></RequireAccess>;
}
