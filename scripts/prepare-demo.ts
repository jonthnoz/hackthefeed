import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { contentSchema, toReference } from '../server/oriane';
import { studySchema, type Reference, type Study } from '../shared/schema';

const rawRun = z.object({ response: z.object({ data: z.object({ results: z.array(z.unknown()) }) }) });
const paths = ['research/oriane/results.json','research/oriane/final-results.json','research/oriane/final-followups.json','research/oriane/final-full-evidence.json','research/oriane/final-recovered-full.json'];
const contents = new Map<string, z.infer<typeof contentSchema>>();
for (const file of paths) {
  const raw: unknown = JSON.parse(await readFile(file,'utf8'));
  const runs = Array.isArray(raw) ? z.array(rawRun).parse(raw) : [rawRun.parse(raw)];
  for (const run of runs) for (const item of run.response.data.results) {
    const content = contentSchema.parse(item);
    const previous = contents.get(content.id);
    if (!previous || (content.media[0]?.frames?.length ?? 0) >= (previous.media[0]?.frames?.length ?? 0)) contents.set(content.id,content);
  }
}
await mkdir('public/media',{recursive:true});
await mkdir('data',{recursive:true});
const titles: Record<string,string> = {
  cnt_8d8a072b69a716cd9353697a2328: 'Saved on TikTok. Lost when you need it.',
  cnt_4c2eaff6a5de128426577775304a: 'Your Paris trip, without the 37 tabs.',
  cnt_199efb33944c3dbefa55799dfb6d: 'A better walk starts with saved places.',
  cnt_fe669ff4f9677d96bb1236ad3ed4: 'Travel posts become a real itinerary.',
  cnt_6cad656b5445061640df43053530: 'The moon is a location clue.',
  cnt_e79aa0446642aa50a9a39776c7c3: 'One image. The exact object, found.',
  cnt_e4187482e35d3f40840ec91df00d: 'Turn a visual question into a reveal.',
  cnt_3458461413635e9923e187a5fc14: 'From overloaded notes to flashcards.',
  cnt_d8ca2e7ba98b29edaa48aa2ba2ef: 'Hours of reading. Still not getting it.',
  cnt_ecbeb808a918249ae95062e251e1: 'Show the study tool in the real routine.',
};
const details: Record<string,{ relevance: Reference['relevance']; reason: string; format: string; hook: string }> = {
  cnt_8d8a072b69a716cd9353697a2328: {relevance:'direct',reason:'The narrator describes saving restaurants on TikTok, then struggling to find nearby ones when hungry. A map is the visible remedy.',format:'Voiceover + place montage',hook:'Most travelers ruin their first day in Barcelona like this.'},
  cnt_4c2eaff6a5de128426577775304a: {relevance:'adjacent',reason:'The same scattered-planning problem becomes one map and itinerary. It is a web planner, not a social-post importer.',format:'Creator-led app demonstration',hook:'If you’re coming to Paris, you probably have a dozen tabs open.'},
  cnt_199efb33944c3dbefa55799dfb6d: {relevance:'adjacent',reason:'A creator places a saved-location tool inside a concrete walking routine. The use occasion makes the benefit easy to understand.',format:'UGC + interface overlays',hook:'How I plan my psychotically long walks.'},
  cnt_fe669ff4f9677d96bb1236ad3ed4: {relevance:'direct',reason:'Trip Builder is presented as saving travel posts, locating places and building an itinerary. This is a close functional reference.',format:'Creator-led product demonstration',hook:'If you’re planning to come to Korea and looking for an easy way to travel…'},
  cnt_6cad656b5445061640df43053530: {relevance:'mechanism',reason:'GeoGuessr players infer a location from visual clues. Transfer the clue-to-proof sequence, not the gaming context.',format:'Explainer + visual evidence',hook:'Some GeoGuessr players use the moon to determine where they are.'},
  cnt_e79aa0446642aa50a9a39776c7c3: {relevance:'mechanism',reason:'A reference image becomes a matching item through reverse image search. It is product identification, not place identification.',format:'UGC + search demonstration',hook:'Are you using reverse image search to its fullest extent?'},
  cnt_e4187482e35d3f40840ec91df00d: {relevance:'mechanism',reason:'The viewer is invited to inspect images before a reveal. This supplies a curiosity structure, not proof about Sokka’s competitors.',format:'Visual quiz + explanation',hook:'Can you separate a real painting from a computer-generated one?'},
  cnt_3458461413635e9923e187a5fc14: {relevance:'direct',reason:'The interface explicitly converts course notes into flashcards and shows mastery controls. The evidence is visible at 48.8 seconds.',format:'Student routine + app demo',hook:'When one subject has more requirements than all your others combined.'},
  cnt_d8ca2e7ba98b29edaa48aa2ba2ef: {relevance:'direct',reason:'The student goes from repeated reading to a photographed concept, explanation and generated self-quiz.',format:'UGC + hands-on demonstration',hook:'I’ve been studying for hours but I still don’t get this concept.'},
  cnt_ecbeb808a918249ae95062e251e1: {relevance:'adjacent',reason:'The creator demonstrates turning class material into memory-testing quizzes inside a broader study tool.',format:'UGC + interface overlays',hook:'If you’ve got the study scaries about next semester…'},
};
const references = new Map<string,Reference>();
for (const [id,title] of Object.entries(titles)) {
  const content = contents.get(id);
  if (!content) throw new Error(`Missing verified content ${id}`);
  const reference = toReference(content);
  if (id==='cnt_3458461413635e9923e187a5fc14') {
    const proof = content.media[0]?.frames?.find(frame => frame.timestampSeconds===48.8);
    if (proof) reference.frames.splice(1,0,{url:proof.url,seconds:proof.timestampSeconds,text:proof.onScreenTextRegions?.map(r=>r.text).join(' · ')??''});
    reference.frames.sort((left,right)=>left.seconds-right.seconds);
  }
  const thumbnailPath = `public/media/${id}-thumb.webp`;
  const thumbnail = await fetch(reference.thumbnail);
  if (!thumbnail.ok) throw new Error(`Missing thumbnail ${id}`);
  await writeFile(thumbnailPath,Buffer.from(await thumbnail.arrayBuffer()));
  reference.thumbnail = `/media/${id}-thumb.webp`;
  for (const [index,frame] of reference.frames.entries()) {
    const response = await fetch(frame.url);
    if (!response.ok) throw new Error(`Missing frame ${id}`);
    await writeFile(`public/media/${id}-${index}.webp`,Buffer.from(await response.arrayBuffer()));
    frame.url = `/media/${id}-${index}.webp`;
  }
  const detail = details[id];
  if (!detail) throw new Error('Missing source interpretation');
  references.set(id,{...reference,title,...detail,relevanceReason:detail.reason});
}
const ids = {
  barcelona:'cnt_8d8a072b69a716cd9353697a2328', paris:'cnt_4c2eaff6a5de128426577775304a', walks:'cnt_199efb33944c3dbefa55799dfb6d', trip:'cnt_fe669ff4f9677d96bb1236ad3ed4',
  geo:'cnt_6cad656b5445061640df43053530', image:'cnt_e79aa0446642aa50a9a39776c7c3', quiz:'cnt_e4187482e35d3f40840ec91df00d', wps:'cnt_3458461413635e9923e187a5fc14', gauth:'cnt_d8ca2e7ba98b29edaa48aa2ba2ef', gemini:'cnt_ecbeb808a918249ae95062e251e1',
};
const pick=(selected:string[])=>selected.map(id=>{const ref=references.get(id);if(!ref)throw new Error(id);return ref;});
const common={createdAt:'2026-11-07T16:00:00.000Z',origin:'curated',language:'English',constraints:{noRealPeople:false,exclude:''},excludedReferences:[],uncertainReferences:[],constraintAssessments:{},resources:[],projectSources:[]} satisfies Pick<Study,'createdAt'|'origin'|'language'|'constraints'|'excludedReferences'|'uncertainReferences'|'constraintAssessments'|'resources'|'projectSources'>;
const studies: Study[] = [
  {...common,id:'demo-places',product:'Sokka Map',tagline:'From saved videos to places you’ll actually go.',brief:'Sokka turns TikTok and Instagram posts into real places on your personal map. Save and organize restaurants, cafés and travel discoveries.',promise:'Turn saved places into actual plans',question:'How do you make “all your saved places, on one map” feel immediately useful?',overview:'The most useful references start with a familiar moment: too many saved videos, too many tabs, and no idea where to go. The map becomes the payoff, not the opening explanation.',searchNotes:['Verified references from need-guided and nearby-value searches.','The examples show observable approaches, not a causal ranking of winning formats.','Metrics are indexed snapshots. The same approach can perform differently on your account.'],references:pick([ids.barcelona,ids.paris,ids.walks,ids.trip]),angles:[
    {id:'familiar-frustration',title:'Start with the mess.',label:'PROBLEM → PAYOFF',description:'Make viewers recognize their own saved-video problem before introducing the app.',whyItFits:'Sokka resolves something people already do: collecting places without making them usable.',evidence:'The Barcelona creator describes scrolling through saved TikToks when hungry. The Paris planner turns scattered tabs into one place.',referenceIds:[ids.barcelona,ids.paris],suggestedHook:'You saved 47 restaurants. So… where are we eating?',visualDirection:'A fast stack of saved food videos, a hesitant pause, then a single clean map.'},
    {id:'show-transformation',title:'Let the product prove it.',label:'VISIBLE TRANSFORMATION',description:'Show the few gestures that turn a video into a place. The result should be understandable without a feature list.',whyItFits:'Sharing a post and seeing its place appear is Sokka’s shortest explanation.',evidence:'Trip Builder shows saving travel posts. The reference planner and walking routine give the map a concrete role.',referenceIds:[ids.trip,ids.paris,ids.walks],suggestedHook:'That place from your feed? It’s on your map now.',visualDirection:'A source video, the share action, and the saved place. Keep the original and the result together.'},
    {id:'specific-moment',title:'Give it a real occasion.',label:'SITUATION FIRST',description:'Anchor the app in tonight’s dinner, a walk or the first day of a trip.',whyItFits:'A specific moment gives an abstract map a reason to matter right now.',evidence:'The walking routine, Barcelona’s first-day problem and Korea trip demonstration all use a recognizable occasion.',referenceIds:[ids.walks,ids.barcelona,ids.trip],suggestedHook:'Your friend says “pick somewhere.” Open this.',visualDirection:'A message from a friend, nearby saved places, and one choice that becomes a real plan.'},
  ],storyboard:{title:'47 saves. One actual plan.',premise:'Turn an everyday frustration into a visible product payoff.',hook:'You saved 47 restaurants. So… where are we eating?',scenes:[{time:'00–04s',visual:'A messy stack of saved restaurant videos. A friend texts: “Where are we eating?”',voiceover:'You saved all these places. But when it’s time to go…'},{time:'04–09s',visual:'Scroll, hesitate, open another tab. Stop on one restaurant video.',voiceover:'…finding the right one is a whole other job.'},{time:'09–18s',visual:'Share the post to Sokka. Show the found place and its map pin side by side.',voiceover:'Send the video to Sokka. The place lands on your map.'},{time:'18–25s',visual:'Choose a nearby saved spot. End on the app, not a list of features.',voiceover:'Less saving for someday. More actually going.'}],callToAction:'Save the place. Make the plan. Try Sokka Map.',sourceIds:[ids.barcelona,ids.paris,ids.trip]}},
  {...common,id:'demo-identify',product:'Sokka Map',tagline:'The place is in the video. The address doesn’t have to be.',brief:'Sokka can identify addresses that are not explicitly mentioned, using visual and contextual clues in a social video.',promise:'Find a place from the clues in a video',question:'How do you show the value of finding an address nobody mentioned?',overview:'Treat the missing address as the beginning of a tiny investigation. Nearby references show a useful structure: a visual question, clues, a match, and a reveal. These are creative mechanisms, not direct competitor benchmarks.',searchNotes:['Mechanism-inspired direction. Direct comparable app examples were scarce.','GeoGuessr and reverse-image search are neighboring demonstrations, not Sokka competitors.','A proposed demo must verify that the address is absent from the inputs used.'],references:pick([ids.geo,ids.image,ids.quiz]),angles:[
    {id:'clue-reveal',title:'Make the viewer investigate.',label:'CLUE → REVEAL',description:'Show a place with no address, invite a guess, then reveal a verified match.',whyItFits:'The gap between a beautiful place and an unknown address makes Sokka’s capability visible.',evidence:'GeoGuessr explains how clues reveal a position. The visual quiz holds the answer until viewers inspect the image.',referenceIds:[ids.geo,ids.quiz],suggestedHook:'No name. No address. Can we still find this place?',visualDirection:'A video freeze-frame, subtle highlights on real clues, then the matching place and address.'},
    {id:'image-result',title:'Keep the proof in frame.',label:'BEFORE → MATCH',description:'Place the original image and the found result next to each other so the viewer can judge the match.',whyItFits:'An AI claim is less useful than seeing why the result is the same place.',evidence:'The secondhand-search creator uses an image to retrieve the exact item. The transfer is the visible matching sequence.',referenceIds:[ids.image,ids.geo],suggestedHook:'This video never gives you the address. Watch this.',visualDirection:'Source on the left, found place on the right. Reveal matching details before the map pin.'},
  ],storyboard:{title:'No address. Still found.',premise:'A short visual mystery with an inspectable product reveal.',hook:'No name. No address. Can we still find this place?',scenes:[{time:'00–04s',visual:'An appealing place in a video. Show that the visible caption contains no address.',voiceover:'You want to go here. There’s just one problem.'},{time:'04–08s',visual:'Pause on real contextual details. Keep the question unresolved.',voiceover:'Nobody tells you where it is.'},{time:'08–18s',visual:'Send the video to Sokka. Show the actual matched place beside the original.',voiceover:'Sokka uses the clues to find the place.'},{time:'18–25s',visual:'Reveal the verified address and save it to the map.',voiceover:'From “where is that?” to “let’s go.”'}],callToAction:'Find the place behind the video.',sourceIds:[ids.geo,ids.image]}},
  {...common,id:'demo-study',product:'Recall',tagline:'Your notes, turned into something you can practice.',brief:'A study app transforms course material into flashcards and quizzes, helping students practice rather than reread.',promise:'Turn passive notes into active practice',question:'How do you make a study app useful before you explain its features?',overview:'The references make the student’s frustration visible, then demonstrate a change of behavior: notes become questions, a confusing concept becomes a practice set, and the interface proves the promise.',searchNotes:['A second domain to verify that the research is not tied to travel.','WPS visibly shows flashcard creation at 48.8 seconds.','The sources do not establish long-term learning outcomes or spaced-repetition effectiveness.'],references:pick([ids.wps,ids.gauth,ids.gemini]),angles:[
    {id:'study-frustration',title:'Recognize the study spiral.',label:'FAMILIAR FRUSTRATION',description:'Start with the moment when more reading stops helping.',whyItFits:'The user needs a better way to practice, not another place to store notes.',evidence:'Gauth opens on hours of studying without understanding. WPS shows schoolwork overload.',referenceIds:[ids.gauth,ids.wps],suggestedHook:'You’ve read the same page five times. Now what?',visualDirection:'Repeated highlighting, an approaching exam, then one concrete practice question.'},
    {id:'notes-practice',title:'Show notes becoming questions.',label:'PRODUCT PROOF',description:'Make the transformation happen on screen and let the viewer try answering.',whyItFits:'The output explains a flashcard app more clearly than a list of AI features.',evidence:'WPS shows notes converted to flashcards. Gemini shows class material turned into a custom quiz.',referenceIds:[ids.wps,ids.gemini],suggestedHook:'Don’t reread your notes. Make them ask you questions.',visualDirection:'A page of notes becomes a flashcard. Pause before revealing the answer.'},
  ],storyboard:{title:'From rereading to remembering.',premise:'Let a real practice question demonstrate the value.',hook:'You’ve read the same page five times. Now what?',scenes:[{time:'00–04s',visual:'A student highlights the same paragraph again.',voiceover:'More reading. Same blank.'},{time:'04–09s',visual:'Import a short page of class notes.',voiceover:'Turn those notes into a question.'},{time:'09–18s',visual:'One flashcard appears. Pause, answer, then reveal.',voiceover:'Try remembering before you look.'},{time:'18–25s',visual:'Show a short practice set and a clear next step.',voiceover:'Make your next study session active.'}],callToAction:'Turn your notes into practice.',sourceIds:[ids.wps,ids.gauth,ids.gemini]}},
];
for (const study of studies) await writeFile(`data/${study.id}.json`,JSON.stringify(studySchema.parse(study),null,2)+'\n');
process.stdout.write(`Prepared ${studies.length} verified studies and ${references.size} source references.\n`);
