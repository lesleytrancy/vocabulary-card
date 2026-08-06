import { SUBTITLE_WORDS } from './generatedVocabulary';

// Vocabulary DB schema — replace this module with an API adapter when needed.
// Word: { id: string, word: string, phonetic: string, meaning: string, example?: string, level?: string }
export const VOCABULARY_DB = {
  primary: {
    label: '小学', subtitle: '轻松启蒙', accent: '#ff7058', stats: { average: 8, highest: 21 },
    words: [
      ['p-apple','apple','/ˈæp.əl/','苹果'],['p-cloud','cloud','/klaʊd/','云'],['p-smile','smile','/smaɪl/','微笑'],
      ['p-river','river','/ˈrɪv.ər/','河流'],['p-yellow','yellow','/ˈjel.əʊ/','黄色'],['p-friend','friend','/frend/','朋友'],
    ]
  },
  cet: {
    label: '四六级', subtitle: '大学进阶', accent: '#7868e6', stats: { average: 12, highest: 34 },
    words: [
      ['c-abandon','abandon','/əˈbæn.dən/','放弃；抛弃'],['c-adequate','adequate','/ˈæd.ɪ.kwət/','足够的；合格的'],['c-derive','derive','/dɪˈraɪv/','获得；源自'],
      ['c-emerge','emerge','/ɪˈmɜːdʒ/','出现；显露'],['c-inevitable','inevitable','/ɪˈnev.ɪ.tə.bəl/','不可避免的'],['c-perceive','perceive','/pəˈsiːv/','察觉；理解'],
    ]
  },
  ielts: {
    label: '雅思', subtitle: '冲刺高分', accent: '#16a085', stats: { average: 15, highest: 42 },
    words: [
      ['i-ambiguous','ambiguous','/æmˈbɪɡ.ju.əs/','模棱两可的'],['i-coherent','coherent','/kəʊˈhɪə.rənt/','连贯的；一致的'],['i-deteriorate','deteriorate','/dɪˈtɪə.ri.ə.reɪt/','恶化'],
      ['i-empirical','empirical','/ɪmˈpɪr.ɪ.kəl/','以实验为依据的'],['i-fluctuate','fluctuate','/ˈflʌk.tʃu.eɪt/','波动'],['i-pragmatic','pragmatic','/præɡˈmæt.ɪk/','务实的'],
    ]
  },
  subtitles: {
    label: '影视', subtitle: '字幕语境', accent: '#3478c8', stats: { average: 12, highest: 36 }, words: SUBTITLE_WORDS
  },
  custom: {
    label: '新增', subtitle: '管理我的单词本', accent: '#eea83b', stats: { average: 10, highest: 28 }, words: []
  }
};

for (const deck of Object.values(VOCABULARY_DB)) {
  deck.words = deck.words.map(item => Array.isArray(item)
    ? { id: item[0], word: item[1], phonetic: item[2], meaning: item[3], example: item[4] ?? '' }
    : item);
}
