import type {
  Commandant,
  DistinguishedVisit,
  MuseumArtifact,
  MuseumTour,
  MuseumTourStep,
  Personnel,
} from "@/types/domain";
import { getCommandantDisplayTitle } from "@/lib/utils";

interface TourGuideInput {
  commandants: Commandant[];
  personnel: Personnel[];
  visits: DistinguishedVisit[];
}

const DEFAULT_CREST = "/images/ndc-crest.png";

function buildStep(
  tourId: string,
  stepOrder: number,
  title: string,
  artifact: MuseumArtifact,
  narrationText: string,
  overrides?: Partial<MuseumTourStep>,
): MuseumTourStep {
  return {
    id: `${tourId}-step-${stepOrder}`,
    tourId,
    stepOrder,
    title,
    artifactId: artifact.id,
    artifact,
    narrationText,
    autoAdvance: true,
    durationSec: 18,
    linkedView: artifact.linkedView,
    linkedRecordId: artifact.linkedRecordId,
    mapLat: artifact.mapLat,
    mapLng: artifact.mapLng,
    mapZoom: artifact.mapZoom,
    ...overrides,
  };
}

export function buildFallbackMuseumTours({
  commandants,
  personnel,
  visits,
}: TourGuideInput): MuseumTour[] {
  const currentCommandant =
    commandants.find((entry) => entry.isCurrent) ?? commandants[0] ?? null;
  const latestVisit = visits[0] ?? null;
  const fwcCount = personnel.filter((entry) => entry.category === "FWC").length;
  const fdcCount = personnel.filter((entry) => entry.category === "FDC").length;
  const directingCount = personnel.filter(
    (entry) => entry.category === "Directing Staff",
  ).length;
  const alliedCount = personnel.filter((entry) => entry.category === "Allied").length;
  const currentCommandantTitle = currentCommandant
    ? getCommandantDisplayTitle(currentCommandant)
    : "Commandant profile pending";
  const currentCommandantTenure = currentCommandant
    ? `${currentCommandant.tenureStart}${currentCommandant.tenureEnd ? ` - ${currentCommandant.tenureEnd}` : " - Present"}`
    : "Tenure archive pending";

  const artifacts: Record<string, MuseumArtifact> = {
    aboutNdc: {
      id: "about-ndc-artifact",
      name: "About NDC",
      description:
        "The institutional layer that explains the founding, mandate, milestones, leadership, and collaborations of the college.",
      era: "Institutional Storytelling",
      origin: "National Defence College Nigeria",
      strategicSignificance:
        "Provides context before visitors move into collections, tours, and deeper archive categories.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["history", "mandate", "leadership"],
      galleryCategory: "Institutional",
      linkedView: "about-ndc",
    },
    historyCollection: {
      id: "history-collection-artifact",
      name: "History Collection",
      description:
        "A chronology-led exhibition lane for foundational records, milestone stories, and the museum's institutional memory.",
      era: "Foundational to Contemporary",
      origin: "Museum Collections",
      strategicSignificance:
        "Gives visitors a disciplined starting point for understanding how the college story began and matured.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["history", "collections", "chronology"],
      galleryCategory: "Museum Collections",
      linkedView: "museum-collections",
    },
    stateCollection: {
      id: "state-collection-artifact",
      name: "State Collection",
      description:
        "A civic and national-context gallery that frames the institution against the state and national story it serves.",
      era: "National Context",
      origin: "Museum Collections",
      strategicSignificance:
        "Connects the museum story to national service, identity, and strategic purpose.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["state", "national", "collections"],
      galleryCategory: "Museum Collections",
      linkedView: "museum-collections",
    },
    regionalCollection: {
      id: "regional-collection-artifact",
      name: "Regional Collection",
      description:
        "A wider regional frame for professional exchange, neighbouring context, and shared strategic education themes.",
      era: "Regional Context",
      origin: "Museum Collections",
      strategicSignificance:
        "Shows how the college operates within a broader continental and regional environment.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["regional", "partnerships", "collections"],
      galleryCategory: "Museum Collections",
      linkedView: "museum-collections",
    },
    worldCollection: {
      id: "world-collection-artifact",
      name: "World Collection",
      description:
        "An outward-looking collection lane for global reference points, international defence education, and comparative heritage.",
      era: "Global Perspective",
      origin: "Museum Collections",
      strategicSignificance:
        "Keeps the museum modern, outward-facing, and relevant to international delegates.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["world", "international", "collections"],
      galleryCategory: "Museum Collections",
      linkedView: "museum-collections",
    },
    hallOfFame: {
      id: "hall-of-fame-artifact",
      name: "Hall of Fame",
      description:
        "A ceremonial gallery that brings together commandants, fellows, staff, allied officers, and distinguished visits.",
      era: "Honours Gallery",
      origin: "Archive Layer",
      strategicSignificance:
        "Acts as the prestige bridge between museum storytelling and the deeper institutional archive already present in the app.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["hall-of-fame", "honours", "archives"],
      relatedArtifactIds: [
        "commandants-archive-artifact",
        "fwc-archive-artifact",
        "fdc-archive-artifact",
        "directing-archive-artifact",
        "allied-archive-artifact",
        "visits-archive-artifact",
      ],
      galleryCategory: "Hall of Fame",
      linkedView: "hall-of-fame",
    },
    currentCommandant: {
      id: "current-commandant-artifact",
      name: currentCommandant?.name ?? "Current Commandant",
      description:
        currentCommandant?.bioSummary ??
        currentCommandant?.description ??
        "Leadership continuity is one of the strongest institutional anchors for a guided tour of the museum experience.",
      era: currentCommandantTenure,
      origin: "Commandants Archive",
      strategicSignificance:
        currentCommandant
          ? `${currentCommandantTitle} currently anchors the leadership story that visitors encounter on the homepage and within the leadership trail.`
          : "Current leadership will anchor the leadership trail once commandant records are available.",
      mediaUrls: currentCommandant?.imageUrl ? [currentCommandant.imageUrl] : [DEFAULT_CREST],
      tags: ["leadership", "commandants", "homepage"],
      galleryCategory: "Hall of Fame",
      linkedView: "commandants",
      linkedRecordId: currentCommandant?.id,
      periodLabel: currentCommandantTenure,
    },
    commandantsArchive: {
      id: "commandants-archive-artifact",
      name: "Commandants Archive",
      description:
        `A formal leadership archive containing ${commandants.length} recorded commandant profiles and leadership transitions.`,
      era: "Leadership Continuity",
      origin: "Hall of Fame",
      strategicSignificance:
        "Shows institutional continuity, command succession, and the leadership thread that ties the museum narrative together.",
      mediaUrls: currentCommandant?.imageUrl ? [currentCommandant.imageUrl] : [DEFAULT_CREST],
      tags: ["commandants", "leadership", "archives"],
      galleryCategory: "Hall of Fame",
      linkedView: "commandants",
    },
    fwcArchive: {
      id: "fwc-archive-artifact",
      name: "FWC Gallery",
      description: `A Hall of Fame lane for ${fwcCount} distinguished Fellows of the War College.`,
      era: "Professional Excellence",
      origin: "Hall of Fame",
      strategicSignificance:
        "Recognises fellows whose records strengthen the archive's prestige and academic continuity.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["fwc", "fellows", "hall-of-fame"],
      galleryCategory: "Hall of Fame",
      linkedView: "fwc",
    },
    fdcArchive: {
      id: "fdc-archive-artifact",
      name: "FDC Gallery",
      description: `A Hall of Fame lane for ${fdcCount} distinguished Fellows of the Defence College.`,
      era: "Strategic Scholarship",
      origin: "Hall of Fame",
      strategicSignificance:
        "Highlights advanced strategic scholarship and distinguished achievement within the Defence College tradition.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["fdc", "fellows", "hall-of-fame"],
      galleryCategory: "Hall of Fame",
      linkedView: "fdc",
    },
    directingArchive: {
      id: "directing-archive-artifact",
      name: "Directing Staff Gallery",
      description: `A dedicated lane for ${directingCount} directing staff profiles and their contribution to institutional continuity.`,
      era: "Instruction and Stewardship",
      origin: "Hall of Fame",
      strategicSignificance:
        "Makes the educational and advisory backbone of the college visible inside the honour gallery.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["directing", "staff", "hall-of-fame"],
      galleryCategory: "Hall of Fame",
      linkedView: "directing",
    },
    alliedArchive: {
      id: "allied-archive-artifact",
      name: "Allied Officers Gallery",
      description: `A partnership-oriented lane for ${alliedCount} allied officer profiles and international links.`,
      era: "International Partnerships",
      origin: "Hall of Fame",
      strategicSignificance:
        "Shows the college's wider network and reinforces its international and regional relevance.",
      mediaUrls: [DEFAULT_CREST],
      tags: ["allied", "international", "hall-of-fame"],
      galleryCategory: "Hall of Fame",
      linkedView: "allied",
    },
    visitsArchive: {
      id: "visits-archive-artifact",
      name: latestVisit?.name ? `${latestVisit.name} Visit Record` : "Distinguished Visits Gallery",
      description:
        latestVisit?.description ??
        `A visibility lane for ${visits.length} distinguished visit records, ceremonial engagements, and diplomatic relevance.`,
      era: latestVisit?.date ?? "Diplomatic and Ceremonial Context",
      origin: latestVisit?.country ?? "Distinguished Visits",
      strategicSignificance:
        "Positions collaborations and high-level visits as part of the institutional story rather than as isolated events.",
      mediaUrls: latestVisit?.imageUrl ? [latestVisit.imageUrl] : [DEFAULT_CREST],
      tags: ["visits", "collaborations", "hall-of-fame"],
      galleryCategory: "Hall of Fame",
      linkedView: "visits",
      linkedRecordId: latestVisit?.id,
    },
  };

  const orientationTourId = "tour-orientation";
  const leadershipTourId = "tour-leadership";
  const collectionsTourId = "tour-collections";
  const hallOfFameTourId = "tour-hall-of-fame";

  return [
    {
      id: orientationTourId,
      name: "Orientation Tour",
      description:
        "A concise opening route that introduces the institutional story, the collection layer, and the honour archive.",
      durationEstimateMinutes: 6,
      coverImageUrl: DEFAULT_CREST,
      theme: "Institutional Orientation",
      languageCode: "en-NG",
      autoModeEnabled: true,
      steps: [
        buildStep(
          orientationTourId,
          1,
          "Welcome to the Museum",
          artifacts.aboutNdc,
          "Welcome to the National Defence College Museum. This orientation route introduces the college story, the curated collection layer, and the honour archive that supports deeper institutional exploration.",
          { durationSec: 16 },
        ),
        buildStep(
          orientationTourId,
          2,
          "History Collection Brief",
          artifacts.historyCollection,
          "The history collection gives visitors a chronology-led foundation. It is designed to clarify origins, milestones, and the museum's institutional memory before deeper archive exploration begins.",
        ),
        buildStep(
          orientationTourId,
          3,
          "Collections Overview",
          artifacts.worldCollection,
          "The museum collections move from national and regional context to global perspective, helping visitors understand the college as both an institution and a participant in a wider strategic environment.",
        ),
        buildStep(
          orientationTourId,
          4,
          "Hall of Fame Entry",
          artifacts.hallOfFame,
          "The Hall of Fame is the formal bridge into the archive categories already present on the homepage. It brings leadership, fellows, staff, allied officers, and distinguished visits into one honour gallery.",
          { durationSec: 20 },
        ),
      ],
    },
    {
      id: leadershipTourId,
      name: "Leadership Trail",
      description:
        "A guided route focused on commandant leadership, institutional continuity, and collaboration visibility.",
      durationEstimateMinutes: 8,
      coverImageUrl:
        artifacts.currentCommandant.mediaUrls[0] ?? DEFAULT_CREST,
      theme: "Leadership and Continuity",
      languageCode: "en-NG",
      autoModeEnabled: true,
      steps: [
        buildStep(
          leadershipTourId,
          1,
          "Current Leadership Anchor",
          artifacts.currentCommandant,
          currentCommandant
            ? `${currentCommandant.name} currently anchors the leadership story on the homepage. This step situates the commandant profile as the first point of authority in the visitor experience.`
            : "When commandant records are available, the leadership trail begins with the current commandant as the public anchor of institutional authority.",
          { durationSec: 18 },
        ),
        buildStep(
          leadershipTourId,
          2,
          "Past Commandants Continuity",
          artifacts.commandantsArchive,
          "The commandants archive extends leadership storytelling across time, helping visitors understand succession, continuity, and institutional memory through profile-based leadership records.",
        ),
        buildStep(
          leadershipTourId,
          3,
          "Collaborations and Visibility",
          artifacts.visitsArchive,
          "Distinguished visits and high-level engagements reinforce the strategic reach of the college. In the leadership trail, they are presented as part of institutional relevance rather than as disconnected events.",
        ),
        buildStep(
          leadershipTourId,
          4,
          "Hall of Fame Transition",
          artifacts.hallOfFame,
          "This trail closes by linking leadership to the wider honour gallery, where visitors can continue into fellows, staff, allied officers, and distinguished visits.",
        ),
      ],
    },
    {
      id: collectionsTourId,
      name: "Collection Highlights Tour",
      description:
        "A curated route across the principal museum collection groupings before handing visitors into the archives.",
      durationEstimateMinutes: 9,
      coverImageUrl: DEFAULT_CREST,
      theme: "Exhibition Highlights",
      languageCode: "en-NG",
      autoModeEnabled: true,
      steps: [
        buildStep(
          collectionsTourId,
          1,
          "History Collection",
          artifacts.historyCollection,
          "The collection highlights route begins in the history collection, where institutional memory, foundational records, and chronological storytelling establish the museum's interpretive base.",
        ),
        buildStep(
          collectionsTourId,
          2,
          "State Collection",
          artifacts.stateCollection,
          "The state collection positions the museum within national service and public identity, linking institutional heritage to the civic story around it.",
        ),
        buildStep(
          collectionsTourId,
          3,
          "Regional Collection",
          artifacts.regionalCollection,
          "The regional collection extends the frame beyond the institution itself, helping visitors understand exchange, context, and the college's place within broader strategic networks.",
        ),
        buildStep(
          collectionsTourId,
          4,
          "World Collection",
          artifacts.worldCollection,
          "The world collection gives the museum an outward-looking quality, connecting the local archive to international comparison and global perspective.",
        ),
        buildStep(
          collectionsTourId,
          5,
          "Archive Bridge",
          artifacts.hallOfFame,
          "The collections route closes at the archive bridge, where visitors can move from exhibition storytelling into the Hall of Fame and the record-rich archive views already available in the application.",
          { durationSec: 20 },
        ),
      ],
    },
    {
      id: hallOfFameTourId,
      name: "Hall of Fame Tour",
      description:
        "A formal honours route through the existing archive categories grouped under the Hall of Fame layer.",
      durationEstimateMinutes: 10,
      coverImageUrl: DEFAULT_CREST,
      theme: "Honours and Archives",
      languageCode: "en-NG",
      autoModeEnabled: true,
      steps: [
        buildStep(
          hallOfFameTourId,
          1,
          "Hall of Fame Overview",
          artifacts.hallOfFame,
          "The Hall of Fame presents the existing archive categories as one prestige gallery, allowing visitors to move through leadership, fellows, staff, allied profiles, and distinguished visits in a more ceremonial sequence.",
        ),
        buildStep(
          hallOfFameTourId,
          2,
          "Commandants Gallery",
          artifacts.commandantsArchive,
          "The commandants gallery records leadership continuity and gives the archive one of its strongest institutional narratives.",
        ),
        buildStep(
          hallOfFameTourId,
          3,
          "FWC Gallery",
          artifacts.fwcArchive,
          "The FWC gallery recognises distinguished fellows of the War College and reinforces the archive's academic and professional depth.",
        ),
        buildStep(
          hallOfFameTourId,
          4,
          "FDC Gallery",
          artifacts.fdcArchive,
          "The FDC gallery extends the honours route through distinguished fellows of the Defence College and their contribution to strategic scholarship.",
        ),
        buildStep(
          hallOfFameTourId,
          5,
          "Directing and Allied Profiles",
          artifacts.directingArchive,
          "Directing staff and allied officer records show the educational backbone and partnership dimension of the college's archive system.",
        ),
        buildStep(
          hallOfFameTourId,
          6,
          "Distinguished Visits",
          artifacts.visitsArchive,
          "The Hall of Fame closes with distinguished visits, which connect archive honour, diplomatic visibility, and broader institutional relevance.",
        ),
      ],
    },
  ];
}
