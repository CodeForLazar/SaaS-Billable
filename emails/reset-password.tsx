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

type ResetPasswordEmailProps = {
   name: string;
   url: string;
};

export default function ResetPasswordEmail({ name, url }: ResetPasswordEmailProps) {
   return (
      <Html lang='en'>
         <Head />
         <Preview>Reset your password</Preview>
         <Tailwind config={{ presets: [pixelBasedPreset] }}>
            <Body className='bg-zinc-100 font-sans'>
               <Container className='mx-auto my-10 max-w-[480px] rounded-lg bg-white p-8'>
                  <Heading className='m-0 text-2xl font-semibold text-zinc-900'>
                     Reset your password
                  </Heading>
                  <Text className='text-base text-zinc-700'>Hi {name},</Text>
                  <Text className='text-base text-zinc-700'>
                     We received a request to reset your password. Click the button below to choose
                     a new one.
                  </Text>
                  <Button
                     href={url}
                     className='rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white'
                  >
                     Reset password
                  </Button>
                  <Hr className='my-6 border-zinc-200' />
                  <Text className='text-xs text-zinc-500'>
                     This link expires in 1 hour and can be used once. If you didn&apos;t ask to
                     reset your password, you can ignore this email: your password won&apos;t
                     change.
                  </Text>
               </Container>
            </Body>
         </Tailwind>
      </Html>
   );
}

// Sample data shown in the preview server (npm run email:dev)
ResetPasswordEmail.PreviewProps = {
   name: 'Alex',
   url: 'http://localhost:3000/api/auth/reset-password/example?callbackURL=%2Freset-password'
} satisfies ResetPasswordEmailProps;
