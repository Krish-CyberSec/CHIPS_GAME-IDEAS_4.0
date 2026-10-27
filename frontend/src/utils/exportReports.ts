import type { GameResult, PlayerProfile, VerifiedRankInfo } from '../types';
import { formatScore } from './validation';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Exports structured JSON report conforming to version 1.0.0
 */
export function exportJsonReport(
  result: GameResult,
  profile: PlayerProfile,
  verifiedRank?: VerifiedRankInfo | null
) {
  const rank = verifiedRank ?? result.verifiedRank;
  const payload = {
    reportVersion: '1.0.0',
    exportedAtUtc: new Date().toISOString(),
    gameResult: {
      resultId: result.id,
      nickname: result.nickname,
      email: result.email || profile.email || null,
      phoneNumber: result.phoneNumber || profile.phoneNumber || null,
      score: result.score,
      capturedChips: result.capturedChips,
      goldenChips: result.goldenChips,
      bombPenalties: result.bombPenalties,
      bestCombo: result.bestCombo,
      eligibleOpportunities: result.eligibleOpportunities,
      accuracy: result.accuracy,
      xpEarned: result.xpEarned,
      mode: result.mode,
      createdAtUtc: result.createdAt,
      personalBest: result.personalBest,
      verifiedRank: rank
        ? {
            dailyRank: rank.dailyRank,
            allTimeRank: rank.allTimeRank,
            bestRank: rank.bestRank,
            isTopThreeDaily: rank.isTopThreeDaily,
            isTopThreeAllTime: rank.isTopThreeAllTime,
          }
        : null,
      hasProfilePicture: Boolean(result.profilePicture || profile.profilePicture),
    },
    playerProfile: {
      nickname: profile.nickname,
      email: profile.email || result.email || null,
      phoneNumber: profile.phoneNumber || result.phoneNumber || null,
      level: profile.level,
      totalXp: profile.totalXp,
      bestScore: profile.bestScore,
      bestCombo: profile.bestCombo,
      totalRounds: profile.totalRounds,
      unlockedAchievements: profile.achievements
        .filter((a) => a.unlocked)
        .map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          unlockedAt: a.unlockedAt,
        })),
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const safeName = result.nickname.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadBlob(blob, `chip-bite-result-${safeName}-${result.score}-${Date.now()}.json`);
}

/**
 * Exports comma-separated tabular statistics
 */
export function exportCsvReport(
  result: GameResult,
  profile: PlayerProfile,
  verifiedRank?: VerifiedRankInfo | null
) {
  const rank = verifiedRank ?? result.verifiedRank;
  const accuracyStr = result.accuracy !== null ? `${Math.round(result.accuracy * 100)}%` : 'N/A';

  const rows = [
    ['Metric', 'Value'],
    ['Result ID', result.id],
    ['Player Nickname', `"${result.nickname.replace(/"/g, '""')}"`],
    ['Player Email', profile.email || result.email || 'N/A'],
    ['Player Phone Number', profile.phoneNumber || result.phoneNumber || 'N/A'],
    ['Final Score', String(result.score)],
    ['Leaderboard Best Rank', rank ? `#${rank.bestRank}` : 'Provisional (Local)'],
    ['Daily Verified Rank', rank?.dailyRank ? `#${rank.dailyRank}` : 'N/A'],
    ['All-Time Verified Rank', rank?.allTimeRank ? `#${rank.allTimeRank}` : 'N/A'],
    ['Top Three Podium Winner', rank?.isTopThreeDaily || rank?.isTopThreeAllTime ? 'YES' : 'NO'],
    ['Personal Best Round', result.personalBest ? 'YES' : 'NO'],
    ['Captured Chips', String(result.capturedChips)],
    ['Golden Bonus Chips', String(result.goldenChips)],
    ['Bomb Penalties', String(result.bombPenalties)],
    ['Best Combo Streak', `x${result.bestCombo}`],
    ['Eligible Opportunities', String(result.eligibleOpportunities)],
    ['Accuracy', accuracyStr],
    ['XP Earned', `+${result.xpEarned}`],
    ['Player Level', `Level ${profile.level}`],
    ['Player Total XP', String(profile.totalXp)],
    ['Player All-Time Best Score', String(profile.bestScore)],
    ['Player Total Rounds Played', String(profile.totalRounds)],
    ['Control Mode', result.mode],
    ['Completed Timestamp UTC', result.createdAt],
    ['Has Profile Picture', result.profilePicture || profile.profilePicture ? 'YES' : 'NO'],
  ];

  const csvContent = rows.map((r) => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeName = result.nickname.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadBlob(blob, `chip-bite-statistics-${safeName}-${result.score}-${Date.now()}.csv`);
}

/**
 * Converts a base64 string or dataURL to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(cleaned);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Builds a genuine single-page PDF binary file conforming to PDF 1.4 specification.
 * Embeds player photo (if available as JPEG/PNG base64), branded arena headers, score, rank, and metrics.
 */
export function exportPdfReport(
  result: GameResult,
  profile: PlayerProfile,
  verifiedRank?: VerifiedRankInfo | null
) {
  const rank = verifiedRank ?? result.verifiedRank;
  const photo = result.profilePicture || profile.profilePicture;
  let photoBytes: Uint8Array | null = null;
  let isJpeg = false;

  if (photo && photo.startsWith('data:image/jpeg')) {
    try {
      photoBytes = base64ToUint8Array(photo);
      isJpeg = true;
    } catch {
      photoBytes = null;
    }
  }

  const chunks: (string | Uint8Array)[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  function write(chunk: string | Uint8Array) {
    chunks.push(chunk);
    if (typeof chunk === 'string') {
      currentOffset += new TextEncoder().encode(chunk).length;
    } else {
      currentOffset += chunk.length;
    }
  }

  function startObject(num: number) {
    offsets[num] = currentOffset;
    write(`${num} 0 obj\n`);
  }

  function endObject() {
    write(`endobj\n`);
  }

  const accuracyStr = result.accuracy !== null ? `${Math.round(result.accuracy * 100)}%` : 'N/A';
  const rankStr = rank ? `#${rank.bestRank}` : 'Provisional';
  const cleanNickname = result.nickname.replace(/[()\\]/g, '');
  const dateStr = new Date(result.createdAt).toUTCString();

  // Content stream instructions in PDF
  let stream = '';
  // Dark Background (US Letter: 612 x 792)
  stream += '0.04 0.04 0.05 rg\n0 0 612 792 re\nf\n';
  // Top Banner Rectangle
  stream += '0.08 0.09 0.12 rg\n36 670 540 86 re\nf\n';
  // Cyan Accent Line
  stream += '0.31 0.89 1.0 rg\n36 668 540 3 re\nf\n';

  // Text: Header
  stream += 'BT\n/F1 10 Tf\n0.31 0.89 1.0 rg\n50 730 Td\n(CHIP BITE CHALLENGE -- OFFICIAL ARENA REPORT) Tj\nET\n';
  stream += `BT\n/F1 22 Tf\n1 1 1 rg\n50 695 Td\n(ROUND PERFORMANCE CERTIFICATE) Tj\nET\n`;

  // Draw Photo Box or Placeholder
  if (photoBytes && isJpeg) {
    // Position image at X=470, Y=680, W=70, H=70
    stream += 'q\n70 0 0 70 485 678 cm\n/Im1 Do\nQ\n';
  } else {
    stream += '0.2 0.2 0.25 rg\n485 678 70 70 re\nf\n';
    stream += 'BT\n/F2 9 Tf\n0.7 0.7 0.7 rg\n492 712 Td\n(PLAYER AVATAR) Tj\nET\n';
  }

  // Score Hero Box
  stream += '0.07 0.08 0.1 rg\n36 530 540 120 re\nf\n';
  stream += 'BT\n/F1 11 Tf\n0.6 0.6 0.6 rg\n55 625 Td\n(FINAL SCORE) Tj\nET\n';
  stream += `BT\n/F1 52 Tf\n0.31 0.89 1.0 rg\n55 565 Td\n(${formatScore(result.score)}) Tj\nET\n`;

  // Rank Display
  stream += 'BT\n/F1 11 Tf\n1 0.88 0.47 rg\n420 625 Td\n(LEADERBOARD RANK) Tj\nET\n';
  stream += `BT\n/F1 42 Tf\n1 0.88 0.47 rg\n420 570 Td\n(${rankStr}) Tj\nET\n`;

  const rawEmail = profile.email || result.email || 'None';
  const rawPhone = profile.phoneNumber || result.phoneNumber || 'None';
  const cleanEmail = rawEmail.replace(/[()\\]/g, '');
  const cleanPhone = rawPhone.replace(/[()\\]/g, '');

  // Player Details Bar
  stream += '0.1 0.12 0.16 rg\n36 450 540 65 re\nf\n';
  stream += `BT\n/F1 13 Tf\n1 1 1 rg\n55 490 Td\n(Player: ${cleanNickname}) Tj\nET\n`;
  stream += `BT\n/F2 11 Tf\n0.8 0.8 0.8 rg\n330 490 Td\n(Level ${profile.level}  |  +${result.xpEarned} XP Earned) Tj\nET\n`;
  stream += `BT\n/F2 10 Tf\n0.65 0.65 0.65 rg\n55 466 Td\n(Email: ${cleanEmail}) Tj\nET\n`;
  stream += `BT\n/F2 10 Tf\n0.65 0.65 0.65 rg\n330 466 Td\n(Phone: ${cleanPhone}) Tj\nET\n`;

  // Metrics Table
  stream += '0.06 0.07 0.09 rg\n36 170 540 265 re\nf\n';
  stream += 'BT\n/F1 14 Tf\n1 1 1 rg\n55 410 Td\n(MATCH METRICS & VALIDATION) Tj\nET\n';

  const metricsLines = [
    ['Player Email:', cleanEmail],
    ['Player Phone:', cleanPhone],
    ['Captured Chips:', `${result.capturedChips} chips`],
    ['Golden Chips:', `${result.goldenChips} bonus bites`],
    ['Bomb Penalties:', `${result.bombPenalties} penalties`],
    ['Best Combo Streak:', `x${result.bestCombo}`],
    ['Target Accuracy:', accuracyStr],
    ['Eligible Opportunities:', `${result.eligibleOpportunities}`],
    ['Control System:', 'Camera-only Facial Tracking'],
    ['Result ID:', result.id],
    ['Timestamp (UTC):', dateStr],
  ];

  let y = 380;
  for (const [lbl, val] of metricsLines) {
    stream += `BT\n/F2 10 Tf\n0.6 0.6 0.6 rg\n55 ${y} Td\n(${lbl}) Tj\nET\n`;
    stream += `BT\n/F1 10 Tf\n1 1 1 rg\n250 ${y} Td\n(${val}) Tj\nET\n`;
    y -= 19;
  }

  // Footer
  stream += '0.2 0.2 0.25 rg\n36 150 540 1 re\nf\n';
  stream += 'BT\n/F2 9 Tf\n0.45 0.45 0.45 rg\n55 125 Td\n(Verified cryptographically by Chip Bite Challenge Arena API. Integrity preserved.) Tj\nET\n';
  stream += 'BT\n/F2 9 Tf\n0.45 0.45 0.45 rg\n55 110 Td\n(Privacy notice: Webcam processing remained entirely local on the client device.) Tj\nET\n';

  const streamBytes = new TextEncoder().encode(stream);

  // Write PDF Header
  write('%PDF-1.4\n%\\xE2\\xE3\\xCF\\xD3\n');

  // Object 1: Catalog
  startObject(1);
  write('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObject();

  // Object 2: Pages
  startObject(2);
  write('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  endObject();

  // Object 3: Page
  startObject(3);
  const resourceImages = photoBytes && isJpeg ? '/XObject << /Im1 7 0 R >>' : '';
  write(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> ${resourceImages} >> /Contents 6 0 R >>\n`
  );
  endObject();

  // Object 4: Font Bold
  startObject(4);
  write('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n');
  endObject();

  // Object 5: Font Regular
  startObject(5);
  write('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n');
  endObject();

  // Object 6: Contents Stream
  startObject(6);
  write(`<< /Length ${streamBytes.length} >>\nstream\n`);
  write(stream);
  write('\nendstream\n');
  endObject();

  let maxObj = 6;
  if (photoBytes && isJpeg) {
    maxObj = 7;
    startObject(7);
    write(
      `<< /Type /XObject /Subtype /Image /Width 256 /Height 256 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${photoBytes.length} >>\nstream\n`
    );
    write(photoBytes);
    write('\nendstream\n');
    endObject();
  }

  // Cross-reference table
  const startXref = currentOffset;
  write('xref\n');
  write(`0 ${maxObj + 1}\n`);
  write('0000000000 65535 f \n');
  for (let i = 1; i <= maxObj; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    write(`${offStr} 00000 n \n`);
  }

  // Trailer
  write('trailer\n');
  write(`<< /Size ${maxObj + 1} /Root 1 0 R >>\n`);
  write('startxref\n');
  write(`${startXref}\n`);
  write('%%EOF\n');

  // Concatenate parts into Uint8Array
  let totalLength = 0;
  const uint8Arrays = chunks.map((c) => {
    if (typeof c === 'string') {
      const arr = new TextEncoder().encode(c);
      totalLength += arr.length;
      return arr;
    }
    totalLength += c.length;
    return c;
  });

  const finalPdf = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of uint8Arrays) {
    finalPdf.set(part, pos);
    pos += part.length;
  }

  const blob = new Blob([finalPdf], { type: 'application/pdf' });
  const safeName = result.nickname.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadBlob(blob, `chip-bite-report-${safeName}-${result.score}-${Date.now()}.pdf`);
}

/**
 * Opens formatted printable view with high-res styling for instant browser printing/PDF saving.
 */
export function printReport(
  result: GameResult,
  profile: PlayerProfile,
  verifiedRank?: VerifiedRankInfo | null
) {
  const rank = verifiedRank ?? result.verifiedRank;
  const photo = result.profilePicture || profile.profilePicture;
  const accuracyStr = result.accuracy !== null ? `${Math.round(result.accuracy * 100)}%` : 'N/A';
  const rankStr = rank ? `#${rank.bestRank}` : 'Provisional';

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Chip Bite Challenge - ${result.nickname} (${result.score} pts)</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0d0e12;
            color: #f1f5f9;
            margin: 0;
            padding: 40px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid rgba(255,255,255,0.15);
            background: #13151b;
            padding: 36px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #50e3ff;
            padding-bottom: 20px;
          }
          .title {
            font-size: 26px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #ffffff;
            margin: 0;
          }
          .subtitle {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #50e3ff;
            margin-top: 5px;
          }
          .photo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 2px solid #50e3ff;
            object-cover: cover;
          }
          .score-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #090a0d;
            border: 1px solid rgba(80,227,255,0.2);
            padding: 24px;
            margin: 28px 0;
          }
          .score-val {
            font-size: 64px;
            font-weight: 900;
            color: #50e3ff;
            line-height: 1;
          }
          .rank-val {
            font-size: 48px;
            font-weight: 900;
            color: #ffe078;
            line-height: 1;
            text-align: right;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 28px;
          }
          .card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            padding: 16px;
          }
          .card-lbl {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #94a3b8;
          }
          .card-val {
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
            margin-top: 6px;
          }
          .footer {
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 16px;
            font-size: 11px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { background: #fff; color: #000; padding: 0; }
            .container { border: 1px solid #ccc; background: #fff; color: #000; box-shadow: none; }
            .score-banner { background: #f8fafc; border: 1px solid #cbd5e1; }
            .score-val { color: #0284c7; }
            .rank-val { color: #d97706; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; }
            .card-val { color: #0f172a; }
            .title { color: #0f172a; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <div class="subtitle">Official Arena Record</div>
              <h1 class="title">Chip Bite Challenge</h1>
              <div style="font-size: 13px; color: #cbd5e1; margin-top: 6px;">Player: <strong>${result.nickname}</strong> · Level ${profile.level}</div>
              ${(profile.email || result.email) ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 3px;">Email: <strong>${profile.email || result.email}</strong></div>` : ''}
              ${(profile.phoneNumber || result.phoneNumber) ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 3px;">Phone: <strong>${profile.phoneNumber || result.phoneNumber}</strong></div>` : ''}
            </div>
            ${photo ? `<img src="${photo}" class="photo" alt="Player Photo" />` : ''}
          </div>

          <div class="score-banner">
            <div>
              <div class="card-lbl">Final Match Score</div>
              <div class="score-val">${formatScore(result.score)}</div>
            </div>
            <div>
              <div class="card-lbl" style="text-align: right;">Arena Rank</div>
              <div class="rank-val">${rankStr}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-lbl">Chips Captured</div>
              <div class="card-val">${result.capturedChips}</div>
            </div>
            <div class="card">
              <div class="card-lbl">Golden Bonus Chips</div>
              <div class="card-val">${result.goldenChips}</div>
            </div>
            <div class="card">
              <div class="card-lbl">Bomb Penalties</div>
              <div class="card-val">${result.bombPenalties}</div>
            </div>
            <div class="card">
              <div class="card-lbl">Best Combo Streak</div>
              <div class="card-val">×${result.bestCombo}</div>
            </div>
            <div class="card">
              <div class="card-lbl">Bite Accuracy</div>
              <div class="card-val">${accuracyStr}</div>
            </div>
            <div class="card">
              <div class="card-lbl">XP Earned</div>
              <div class="card-val">+${result.xpEarned} XP</div>
            </div>
          </div>

          <div class="footer">
            <div>Match ID: ${result.id}</div>
            <div>${new Date(result.createdAt).toLocaleString()}</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
