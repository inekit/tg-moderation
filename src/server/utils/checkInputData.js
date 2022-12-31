module.exports = function checkInputData(obj, ...fields) {
  if (!obj || typeof obj !== 'object') return false;

  let isPassed = true;
  console.log(obj, fields);
  for (field of fields) {
    if (!obj[field]) {
      isPassed = false;
      break;
    }
  }
  return isPassed;
};
