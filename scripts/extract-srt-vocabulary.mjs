import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = resolve(ROOT, process.argv[2] || 'rescues');
const outputFile = resolve(ROOT, process.argv[3] || 'src/generatedVocabulary.js');
const maxWords = Number(process.env.MAX_WORDS || 120);

// Pronouns, auxiliaries, articles, conjunctions and other beginner-level words.
const BASIC_WORDS = new Set(`a an the i me my mine myself you your yours yourself yourselves he him his himself she her hers herself it its itself we us our ours ourselves they them their theirs themselves this that these those who whom whose what which where when why how am is are was were be been being have has had having do does did doing will would shall should can could may might must and or but so because if then than as at by for from in into of off on onto out over to up with about after again against all also any both each few more most no nor not only other same some such too very here there now just ever never once get gets got getting go goes went gone come comes came coming make makes made making say says said saying see sees saw seen know knows knew known think thinks thought want wants wanted need needs needed like likes liked take takes took taken tell tells told look looks looked use uses used give gives gave given find finds found work works worked call calls called try tries tried ask asks asked feel feels felt become becomes became leave leaves left put keep keeps kept let begin begins began seem seems seemed help helps helped show shows showed hear hears heard play plays played run runs ran move moves moved live lives lived believe believes believed bring brings brought happen happens happened write writes wrote written sit sits sat stand stands stood lose loses lost pay pays paid meet meets met include includes included continue continues continued set learn learns learned change changes changed lead leads led understand understands understood watch watches watched follow follows followed stop stops stopped create creates created speak speaks spoke spoken read reads allow allows allowed add adds added spend spends spent grow grows grew grown open opens opened walk walks walked win wins won offer offers offered remember remembers remembered love loves loved consider considers considered appear appears appeared buy buys bought wait waits waited serve serves served die dies died send sends sent expect expects expected build builds built stay stays stayed fall falls fell fallen cut reach reaches reached kill kills killed remain remains remained yes yeah okay ok well really gonna wanna gotta hey man guys guy thing things something somebody anyone everyone people person time day way year good great right back even much many little own sure down still every first last long new old big small one two three four five six seven eight nine ten fuck fucking shit damn hell`.split(/\s+/));
const NAME_JOINERS = new Set(['of', 'the', 'and', '&']);

function decodeSubtitle(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const replacementRate = (utf8.match(/�/g) || []).length / Math.max(utf8.length, 1);
  return replacementRate > 0.001 ? new TextDecoder('gb18030').decode(buffer) : utf8;
}

function subtitleBlocks(raw) {
  return raw.replace(/^\uFEFF/gm, '').replace(/<[^>]+>/g, '').replace(/\{\\[^}]+\}/g, '')
    .split(/\r?\n\s*\r?\n/)
    .map(block => {
      const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
        .filter(line => !/^\d+$/.test(line) && !/-->/.test(line));
      const english = lines.filter(line => /[A-Za-z]{2}/.test(line) && !/[\u3400-\u9fff]/.test(line)).join(' ')
        .replace(/\s+/g, ' ').replace(/^[-–—]\s*/, '').trim();
      const chinese = lines.filter(line => /[\u3400-\u9fff]/.test(line)).join(' ')
        .replace(/\s+/g, ' ').trim();
      return { english, chinese };
    })
    .filter(({ english, chinese }) => english && chinese && english.length <= 220
      && !/(字幕|翻译|片源|字幕组|倾情奉献|加入我们|q群)/i.test(chinese));
}

function tokensIn(text) {
  return [...text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)].map(match => ({
    raw: match[0], lower: match[0].toLowerCase(), index: match.index,
  }));
}

function properNouns(tokens) {
  const phrases = [];
  const consumed = new Set();
  const capitalized = token => /^[A-Z]/.test(token.raw);
  const distinctive = token => /[A-Z].*[A-Z]/.test(token.raw) || /^[A-Z]{2,}$/.test(token.raw);

  for (let start = 0; start < tokens.length; start += 1) {
    if (!capitalized(tokens[start])) continue;
    let end = start;
    while (end + 1 < tokens.length) {
      const next = tokens[end + 1];
      if (capitalized(next)) { end += 1; continue; }
      if (NAME_JOINERS.has(next.lower) && capitalized(tokens[end + 2] || { raw: '' })) { end += 2; continue; }
      break;
    }

    // A capitalized word away from sentence start is a name; at sentence start it
    // must be multi-word or have internal capitals (PiperNet) to avoid false hits.
    const isSentenceStart = tokens[start].index === 0;
    if (end > start || distinctive(tokens[start]) || !isSentenceStart) {
      const phraseTokens = tokens.slice(start, end + 1);
      const words = phraseTokens.map(token => token.raw);
      // Drop a leading sentence article, but retain it in names such as "The Gates of Galloo".
      if (words.length === 2 && /^The$/i.test(words[0])) words.shift();
      const value = words.join(' ');
      if (value.length >= 2) {
        phrases.push({ value, start, end });
        for (let index = start; index <= end; index += 1) consumed.add(index);
      }
      start = end;
    }
  }
  return { phrases, consumed };
}

function addCandidate(map, value, english, chinese, type) {
  const key = value.toLowerCase();
  const entry = map.get(key) || { display: value, count: 0, examples: [], type };
  entry.count += 1;
  if (entry.examples.length < 3 && !entry.examples.some(item => item.english === english)) {
    entry.examples.push({ english, chinese });
  }
  map.set(key, entry);
}

const files = (await readdir(inputDir)).filter(file => extname(file).toLowerCase() === '.srt').sort();
if (!files.length) throw new Error(`No .srt files found in ${inputDir}`);

const candidates = new Map();
for (const file of files) {
  const buffer = await readFile(resolve(inputDir, file));
  for (const { english, chinese } of subtitleBlocks(decodeSubtitle(buffer))) {
    const tokens = tokensIn(english);
    const { phrases, consumed } = properNouns(tokens);
    for (const phrase of phrases) addCandidate(candidates, phrase.value, english, chinese, 'proper-noun');
    for (const [index, token] of tokens.entries()) {
      if (consumed.has(index) || token.lower.length < 4 || token.lower.includes("'") || BASIC_WORDS.has(token.lower)) continue;
      addCandidate(candidates, token.lower, english, chinese, 'word');
    }
  }
}

const selected = [...candidates.entries()]
  .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
  .slice(0, maxWords)
  .map(([key, data]) => {
    const example = data.examples.sort((a, b) => a.english.length - b.english.length)[0];
    return {
      id: `srt-${key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      word: data.display,
      phonetic: '',
      meaning: example.chinese,
      example: example.english,
      level: data.type === 'proper-noun' ? '专有名词' : '影视',
    };
  });

const source = `// Generated by \`npm run extract-srt\`. Do not edit by hand.\nexport const SUBTITLE_WORDS = ${JSON.stringify(selected, null, 2)};\n`;
await writeFile(outputFile, source, 'utf8');
console.log(`Extracted ${selected.length} entries from ${files.length} bilingual SRT file(s) into ${outputFile}`);
