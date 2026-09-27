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

type InvoiceReminderEmailProps = {
   fromName: string;
   clientName: string;
   number: string;
   total: string; // "$1,234.00"
   dueDate: string; // "Oct 11, 2026"
   overdue: boolean; // the due date has passed (on the sender's calendar)
   url: string; // the public invoice page, where the client can pay
};

/** Subject line, shared by the email and the service that sends it. */
export function reminderSubject({
   number,
   dueDate,
   overdue
}: Pick<InvoiceReminderEmailProps, 'number' | 'dueDate' | 'overdue'>) {
   return overdue
      ? `Reminder: invoice ${number} is overdue`
      : `Reminder: invoice ${number} is due on ${dueDate}`;
}

// A friendly nudge for an unpaid invoice, sent by hand from the invoice page. PDF attached again,
// so the client doesn't have to dig out the first email.
export default function InvoiceReminderEmail({
   fromName,
   clientName,
   number,
   total,
   dueDate,
   overdue,
   url
}: InvoiceReminderEmailProps) {
   return (
      <Html lang='en'>
         <Head />
         <Preview>{`${reminderSubject({ number, dueDate, overdue })}: ${total} from ${fromName}`}</Preview>
         <Tailwind config={{ presets: [pixelBasedPreset] }}>
            <Body className='bg-zinc-100 font-sans'>
               <Container className='mx-auto my-10 max-w-[480px] rounded-lg bg-white p-8'>
                  <Heading className='m-0 text-2xl font-semibold text-zinc-900'>
                     {overdue ? 'Payment overdue' : 'Payment reminder'}
                  </Heading>
                  <Text className='text-base text-zinc-700'>
                     Hi {clientName}, this is a friendly reminder that invoice{' '}
                     <strong>{number}</strong> from <strong>{fromName}</strong>{' '}
                     {overdue
                        ? `was due on ${dueDate} and is still unpaid.`
                        : `is due on ${dueDate}.`}
                  </Text>
                  <Section className='rounded-md bg-zinc-50 px-5 py-2'>
                     <Text className='m-0 text-sm text-zinc-500'>Amount due</Text>
                     <Text className='m-0 text-2xl font-semibold text-zinc-900'>{total}</Text>
                     <Text
                        className={`mt-1 text-sm ${overdue ? 'font-medium text-red-700' : 'text-zinc-500'}`}
                     >
                        {overdue ? `Overdue since ${dueDate}` : `Due ${dueDate}`}
                     </Text>
                  </Section>
                  <Button
                     href={url}
                     className='mt-6 rounded-md bg-emerald-700 px-5 py-3 text-sm font-medium text-white'
                  >
                     View and pay invoice
                  </Button>
                  <Hr className='my-6 border-zinc-200' />
                  <Text className='text-xs text-zinc-500'>
                     The invoice is attached as a PDF. Already paid? Thank you, and please ignore
                     this email. Questions? Just reply to it.
                  </Text>
               </Container>
            </Body>
         </Tailwind>
      </Html>
   );
}

// Sample data shown in the preview server (npm run email:dev)
InvoiceReminderEmail.PreviewProps = {
   fromName: 'Acme Design',
   clientName: 'Jane Cooper',
   number: 'INV-0007',
   total: '$1,234.00',
   dueDate: 'Oct 11, 2026',
   overdue: true,
   url: 'http://localhost:3000/i/example'
} satisfies InvoiceReminderEmailProps;
