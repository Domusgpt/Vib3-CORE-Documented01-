const psychoBandBreakpoints = [60, 250, 500, 2000, 4000, 8000, 20000];

function normalizeBandsFromFFT(fft, sampleRate = 48000) {
  const binCount = fft.length;
  const bandAverages = [0, 0, 0, 0, 0, 0, 0];
  const bandCounts = [0, 0, 0, 0, 0, 0, 0];

  const binWidth = sampleRate / (binCount * 2);

  for (let i = 0; i < binCount; i++) {
    const frequency = i * binWidth;
    const magnitude = fft[i] / 255;
    const bandIndex = psychoBandBreakpoints.findIndex((edge) => frequency <= edge);
    const targetBand = bandIndex === -1 ? psychoBandBreakpoints.length - 1 : bandIndex;
    bandAverages[targetBand] += magnitude;
    bandCounts[targetBand] += 1;
  }

  return bandAverages.map((total, idx) => {
    const count = Math.max(1, bandCounts[idx]);
    return Number((total / count).toFixed(4));
  });
}

export { psychoBandBreakpoints, normalizeBandsFromFFT };
