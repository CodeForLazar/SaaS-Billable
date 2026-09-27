'use client';

import {
   Select,
   SelectContent,
   SelectGroup,
   SelectItem,
   SelectLabel,
   SelectTrigger,
   SelectValue
} from '@/components/ui/select';
import type { ProjectGroup } from './group-projects';

// Projects grouped under their client, submitted as "projectId". Used by the timer and the
// manual entry form.
export function ProjectSelect({
   groups,
   defaultValue,
   invalid
}: {
   groups: ProjectGroup[];
   defaultValue?: string;
   invalid?: boolean;
}) {
   // items: the flat list of all projects, so the field shows the chosen project's name
   const items = groups.flatMap((group) => group.projects);

   return (
      <Select key={defaultValue} name='projectId' items={items} defaultValue={defaultValue || null}>
         <SelectTrigger id='projectId' className='w-full' aria-invalid={invalid}>
            <SelectValue placeholder='Choose a project' />
         </SelectTrigger>
         <SelectContent>
            {groups.map((group) => (
               <SelectGroup key={group.client}>
                  <SelectLabel>{group.client}</SelectLabel>
                  {group.projects.map((project) => (
                     <SelectItem key={project.value} value={project.value}>
                        {project.label}
                     </SelectItem>
                  ))}
               </SelectGroup>
            ))}
         </SelectContent>
      </Select>
   );
}
