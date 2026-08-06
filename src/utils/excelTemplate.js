import writeXlsxFile from 'write-excel-file/browser';

const rows = [
  ['word', 'phonetic', 'meaning', 'level'],
  ['example', '/ɪɡˈzɑːm.pəl/', '例子', '自定义'],
  ['vocabulary', '/vəˈkæb.jə.lər.i/', '词汇', '自定义'],
];

export function downloadWordTemplate() {
  const [header, ...examples] = rows;
  const sheetData = [
    header.map(value => ({ value, fontWeight: 'bold', backgroundColor: '#F5F0E7' })),
    ...examples.map(row => row.map(value => ({ value }))),
  ];

  // write-excel-file v4 returns a writer object; calling toFile() triggers download.
  return writeXlsxFile(sheetData, {
    sheet: '单词模板',
    columns: [{ width: 20 }, { width: 24 }, { width: 28 }, { width: 14 }],
  }).toFile('wordy-单词导入模板.xlsx');
}
