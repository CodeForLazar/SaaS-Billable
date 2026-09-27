import {
   InputGroup,
   InputGroupAddon,
   InputGroupInput,
   InputGroupText
} from '@/components/ui/input-group';
import { currencySymbol } from '@/lib/money';

// A text field for an amount ("75.50") with the currency symbol in front ($, €, CHF...). An
// input group, so a long symbol gets the room it needs. Text, not type="number": number inputs
// accept "1e3", change on scroll, and we parse the text exactly anyway (lib/money.ts).
export function MoneyInput({
   currency,
   suffix,
   ...props
}: React.ComponentProps<'input'> & { currency: string; suffix?: string }) {
   return (
      <InputGroup>
         <InputGroupAddon>
            <InputGroupText>{currencySymbol(currency)}</InputGroupText>
         </InputGroupAddon>
         <InputGroupInput inputMode='decimal' autoComplete='off' {...props} />
         {suffix && (
            <InputGroupAddon align='inline-end'>
               <InputGroupText>{suffix}</InputGroupText>
            </InputGroupAddon>
         )}
      </InputGroup>
   );
}
