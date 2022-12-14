function findNextSymbolPosition(string, symbol, offset, resultArray = []) {
  const position = string.indexOf(symbol, offset);

  if (position !== -1 && position + 1 <= string.length) {
    //resultArray.push(position);
    const res = findNextSymbolPosition(string, symbol, position + 1);

    res.push(position);

    return res;
  }
  return resultArray;
}

function dropMiddleSymbol(string, symbol) {
  const posArr = findNextSymbolPosition(string, symbol, 0);

  if (posArr.length % 2 === 1) {
    const index = Number((posArr.length / 2).toFixed(0));
    console.log(posArr, index);
    const centerSymbol = posArr[index - 1];
    return string.slice(0, centerSymbol) + "\\" + string.slice(centerSymbol);
  }
  return string;
}

module.exports = function fixMarkDown(string, symbols) {
  for (s of symbols) string = dropMiddleSymbol(string, s);

  return string.replaceAll(
    /(\#)|(\.)|(\+)|(\=)|(\-)|(\!)|(\?)|(\,)|(\()|(\))|(\%)|(\@)|(\~)|(\;)|(\^)|(\&)|(\")|(\:)|(\')$/g,
    function replacer(match, p1, offset, string) {
      return `\\${match}`;
    }
  );
};
