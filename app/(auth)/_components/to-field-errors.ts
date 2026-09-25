// Zod gives us errors as strings (['Too short']); shadcn's <FieldError> expects [{ message: 'Too short' }].
export function toFieldErrors(messages?: string[]) {
   return messages?.map((message) => ({ message }));
}
