// A plain module (no 'use client'), so Server Components can CALL groupProjects(). Anything
// exported from a 'use client' file is only a reference on the server: it can be rendered or
// passed as a prop, but calling it throws ("Attempted to call ... from the server").

export type ProjectGroup = { client: string; projects: { value: string; label: string }[] };

/** Projects (sorted by client, then name) -> groups for <ProjectSelect>. */
export function groupProjects(
   projects: { id: string; name: string; archivedAt?: Date | null; client: { name: string } }[]
) {
   const groups: ProjectGroup[] = [];
   for (const project of projects) {
      const item = {
         value: project.id,
         label: project.archivedAt ? `${project.name} (archived)` : project.name
      };
      const last = groups.at(-1);
      if (last?.client === project.client.name) last.projects.push(item);
      else groups.push({ client: project.client.name, projects: [item] });
   }
   return groups;
}
