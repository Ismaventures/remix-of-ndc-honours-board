import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const GUIDE_SECTIONS: Array<{ id: string; title: string; body: string }> = [
  {
    id: 'boot',
    title: 'Boot and Entry Experience',
    body: 'When the app opens, the boot sequence runs first. After loading, you can enter the archive. Admins can tune boot timing and transition behavior from the Transitions tab.',
  },
  {
    id: 'home',
    title: 'Home Screen and Categories',
    body: 'Home shows the current commandant, commandants history, and category cards. Click any category card to open its records. Use the header crest to return to home quickly.',
  },
  {
    id: 'profiles',
    title: 'Profiles and Records',
    body: 'Commandant, personnel, and visit entries open rich profile views. Use these sections to read rank, tenure, citation, and supporting details.',
  },
  {
    id: 'auto',
    title: 'Auto Rotation Display',
    body: 'Auto Rotation plays records like a presentation mode. It can run globally or per category and follows the transition settings saved by admins.',
  },
  {
    id: 'audio',
    title: 'Audio Experience',
    body: 'Audio playback can be managed globally and by context. In admin mode, the Audio Settings panel helps assign and control tracks used in boot and display modes.',
  },
  {
    id: 'admin-data',
    title: 'Admin Data Management',
    body: 'Personnel, Visits, and Commandants tabs are used to add, edit, and remove records. These updates control what all users see in the archive.',
  },
  {
    id: 'admin-theme',
    title: 'Theme Controls',
    body: 'Theme tab provides display style presets. Select a theme draft, then use Apply and Save to publish it so the selected look remains consistent for future sessions.',
  },
  {
    id: 'admin-transitions',
    title: 'Transition Controls',
    body: 'Transitions tab includes timing, transition library, sequence order, per-category behavior, and transition usage guidance. Configure only the section you need by opening its dropdown panel.',
  },
  {
    id: 'save-flow',
    title: 'Apply and Save Workflow',
    body: 'Most advanced settings use draft mode first. Adjust values, preview where available, then click Apply and Save. Saved settings are persisted and reused across devices for the signed-in admin.',
  },
  {
    id: 'tips',
    title: 'Recommended Way to Explore',
    body: 'Start on Home, test Auto Rotation, then enter Admin for deeper control. Change one setting at a time, preview it, and save only when you are satisfied with the result.',
  },
];

export function AppHelperGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
          aria-label="Open helper guide"
        >
          <HelpCircle className="h-4 w-4" />
          Helper Guide
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto border-primary/20 bg-card/95">
        <DialogHeader>
          <DialogTitle className="gold-text">NDC App Helper Guide</DialogTitle>
          <DialogDescription>
            Read what each feature does, then test it confidently using the available controls.
          </DialogDescription>
        </DialogHeader>

        <Accordion type="single" collapsible className="w-full">
          {GUIDE_SECTIONS.map(section => (
            <AccordionItem key={section.id} value={section.id} className="border-primary/10">
              <AccordionTrigger className="text-sm text-foreground hover:no-underline">
                {section.title}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {section.body}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
