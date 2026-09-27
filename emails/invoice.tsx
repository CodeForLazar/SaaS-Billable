import {
   Body,
   Button,
   Container,
   Head,
   Heading,
   Hr,
   Html,
   Preview,
   Section,
   Tailwind,
   Text,
   pixelBasedPreset
} from 'react-email';

type InvoiceEmailProps = {
   fromName: string;
   clientName: string;
   number: string;
   total: string; // "$1,234.00"
   dueDate: string; // "Oct 11, 2026"
   url: string; // the public invoice page
};

// Sent with the PDF attached. The button opens the public invoice page (and, in Phase 6, "Pay").
export default function InvoiceEmail({
   fromName,
   clientName,
   number,
   total,
   dueDate,
   url
}: InvoiceEmailProps) {
   return (
      <Html lang='en'>
         <Head />
         <Preview>{`Invoice ${number} from ${fromName}: ${total} due ${dueDate}`}</Preview>
         <Tailwind config={{ presets: [pixelBasedPreset] }}>
            <Body className='bg-zinc-100 font-sans'>
               <Container className='mx-auto my-10 max-w-[480px] rounded-lg bg-white p-8'>
                  <Heading className='m-0 text-2xl font-semibold text-zinc-900'>
                     Invoice {number}
                  </Heading>
                  <Text className='text-base text-zinc-700'>
                     Hi {clientName}, here is your invoice from <strong>{fromName}</strong>.
                  </Text>
                  <Section className='rounded-md bg-zinc-50 px-5 py-2'>
                     <Text className='m-0 text-sm text-zinc-500'>Amount due</Text>
                     <Text className='m-0 text-2xl font-semibold text-zinc-900'>{total}</Text>
                     <Text className='mt-1 text-sm text-zinc-500'>Due {dueDate}</Text>
                  </Section>
                  <Button
                     href={url}
                     className='mt-6 rounded-md bg-emerald-700 px-5 py-3 text-sm font-medium text-white'
                  >
                     View invoice
                  </Button>
                  <Hr className='my-6 border-zinc-200' />
                  <Text className='text-xs text-zinc-500'>
                     The invoice is also attached as a PDF. Questions? Just reply to this email.
                  </Text>
               </Container>
            </Body>
         </Tailwind>
      </Html>
   );
}

// Sample data shown in the preview server (npm run email:dev)
InvoiceEmail.PreviewProps = {
   fromName: 'Acme Design',
   clientName: 'Jane Cooper',
   number: 'INV-0007',
   total: '$1,234.00',
   dueDate: 'Oct 11, 2026',
   url: 'http://localhost:3000/i/example'
} satisfies InvoiceEmailProps;
