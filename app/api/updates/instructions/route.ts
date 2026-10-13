import {updateInstructions} from '../../../../lib/update-instructions';
export function GET(){return new Response(updateInstructions,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=60'}});}
