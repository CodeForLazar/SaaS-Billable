import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Tailwind, Text, pixelBasedPreset } from 'react-email';

type VerifyEmailProps = {
   name: string;
   url: string;
};

export default function VerifyEmail({ name, url }: VerifyEmailProps) {
   return (
      <Html lang='en'>
         <Head />
         <Preview>Confirm your email address</Preview>
         <Tailwind config={{ presets: [pixelBasedPreset] }}>
            <Body className='bg-zinc-100 font-sans'>
               <Container className='mx-auto my-10 max-w-[480px] rounded-lg bg-white p-8'>
                  <Heading className='m-0 text-2xl font-semibold text-zinc-900'>Confirm your email</Heading>
                  <Text className='text-base text-zinc-700'>Hi {name},</Text>
                  <Text className='text-base text-zinc-700'>
                     Thanks for signing up. Click the button below to confirm your email address and activate your
                     account.
                  </Text>
                  <Button href={url} className='rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white'>
                     Confirm email
                  </Button>
                  <Hr className='my-6 border-zinc-200' />
                  <Text className='text-xs text-zinc-500'>
                     If you didn&apos;t create an account, you can ignore this email.
                  </Text>
               </Container>
            </Body>
         </Tailwind>
      </Html>
   );
}

// Sample data shown in the preview server (npm run email:dev)
VerifyEmail.PreviewProps = {
   name: 'Alex',
   url: 'http://localhost:3000/api/auth/verify-email?token=example'
} satisfies VerifyEmailProps;
