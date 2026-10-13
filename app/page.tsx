import Atlas from './ui/Atlas';
import { identity } from '../lib/server';
export const dynamic='force-dynamic';
export default async function Home(){const user=await identity();return <Atlas user={user?{displayName:user.displayName,isAdmin:user.isAdmin}:null}/>;}
