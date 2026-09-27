import {
   Body,
   Button,
   Container,
   Head,
   Heading,
   Hr,
   Html,
   Preview,
   Tailwind,
   Text,
   pixelBasedPreset
} from 'react-email';

type InvitationEmailProps = {
   inviterName: string;
   organizationName: string;
   role: string;
   url: string;
};

export default function InvitationEmail({
   inviterName,
   organizationName,
   role,
   url
}: InvitationEmailProps) {
   return (
      <Html lang='en'>
         <Head />
         <Preview>{`${inviterName} invited you to join ${organizationName}`}</Preview>
         <Tailwind config={{ presets: [pixelBasedPreset] }}>
            <Body className='bg-zinc-100 font-sans'>
               <Container className='mx-auto my-10 max-w-[480px] rounded-lg bg-white p-8'>
                  <Heading className='m-0 text-2xl font-semibold text-zinc-900'>
                     Join {organizationName}
                  </Heading>
                  <Text className='text-base text-zinc-700'>
                     <strong>{inviterName}</strong> invited you to join the{' '}
                     <strong>{organizationName}</strong> workspace as{' '}
                     {role === 'admin' ? 'an' : 'a'} <strong>{role}</strong>.
                  </Text>
                  <Button
                     href={url}
                     className='rounded-md bg-emerald-700 px-5 py-3 text-sm font-medium text-white'
                  >
                     Accept invitation
                  </Button>
                  <Hr className='my-6 border-zinc-200' />
                  <Text className='text-xs text-zinc-500'>
                     This invitation expires in 48 hours. If you weren&apos;t expecting it, you can
                     ignore this email.
                  </Text>
               </Container>
            </Body>
         </Tailwind>
      </Html>
   );
}

// Sample data shown in the preview server (npm run email:dev)
InvitationEmail.PreviewProps = {
   inviterName: 'Olivia',
   organizationName: 'Acme Design',
   role: 'member',
   url: 'http://localhost:3000/accept-invitation/example'
} satisfies InvitationEmailProps;
