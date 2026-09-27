'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// The invoice's public link with a Copy button, to share it outside of the email.
export function ShareLink({ url }: { url: string }) {
   const [copied, setCopied] = useState(false);

   async function copy() {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   }

   return (
      <div className='flex gap-2'>
         <Input
            value={url}
            readOnly
            aria-label='Public invoice link'
            onFocus={(e) => e.target.select()}
         />
         <Button variant='outline' onClick={copy} aria-label='Copy link'>
            {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
            {copied ? 'Copied' : 'Copy'}
         </Button>
      </div>
   );
}
