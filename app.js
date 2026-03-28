const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const tableBox = $("tableBox");
const paperArea = $("paperArea");
const answerArea = $("answerArea");

let allQuestions = [];
let generated = [];

$("loadBtn").addEventListener("click", loadCsv);
$("makeBtn").addEventListener("click", makeQuiz);
$("printQuestionsBtn").addEventListener("click", () => printMode("questions"));
$("printAnswersBtn").addEventListener("click", () => printMode("answers"));
$("csvFileInput").addEventListener("change", loadLocalCsv);

async function loadCsv() {
  try {
    const res = await fetch("./questions.csv?_=" + Date.now());
    if (!res.ok) throw new Error("questions.csv が見つかりません。");

    const text = await res.text();
    allQuestions = parseCsv(text).map(normalizeRow).filter(Boolean);
    renderTable(allQuestions);
    statusEl.textContent = `${allQuestions.length}問を読み込みました。`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "読み込み失敗: " + err.message;
  }
}

async function loadLocalCsv(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    allQuestions = parseCsv(text).map(normalizeRow).filter(Boolean);
    renderTable(allQuestions);
    statusEl.textContent = `${file.name} を読み込みました。${allQuestions.length}問あります。`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "ローカルCSVの読み込みに失敗しました。";
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (ch === "\r") {
      } else {
        cell += ch;
      }
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] || "").trim();
    });
    return obj;
  });
}

function normalizeRow(r) {
  const rawChoices = [];
  for (let n = 1; n <= 10; n++) {
    rawChoices.push((r[`choice${n}`] || "").trim());
  }

  const choices = rawChoices.filter((v) => v !== "");
  const answerNo = Number(r.answer_no);

  if (!r.question || choices.length < 3) return null;
  if (!(answerNo >= 1 && answerNo <= 10)) return null;
  if (!rawChoices[answerNo - 1]) return null;

  const correctText = rawChoices[answerNo - 1];
  const compactAnswerIndex = choices.indexOf(correctText);

  if (compactAnswerIndex === -1) return null;

  return {
    title: String(r.title || "").trim(),
    field_no: String(r.field_no || "").trim(),
    question_no: String(r.question_no || "").trim(),
    question: r.question.trim(),
    choices,
    answerIndex: compactAnswerIndex
  };
}

function renderTable(rows) {
  if (!rows.length) {
    tableBox.innerHTML = "表示できる問題がありません。";
    return;
  }

  tableBox.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>タイトル</th>
          <th>分野番号</th>
          <th>問題番号</th>
          <th>問題文</th>
          <th>正解</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td>${escapeHtml(r.title)}</td>
            <td>${escapeHtml(r.field_no)}</td>
            <td>${escapeHtml(r.question_no)}</td>
            <td>${escapeHtml(r.question)}</td>
            <td>${escapeHtml(r.choices[r.answerIndex])}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function makeQuiz() {
  if (!allQuestions.length) {
    statusEl.textContent = "先にCSVを読み込んでください。";
    return;
  }

  const inputTitle = $("titleInput").value.trim();
  const count = Math.max(1, Number($("countInput").value || 5));
  const fields = $("fieldInput").value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const pool = fields.length
    ? allQuestions.filter((q) => fields.includes(q.field_no))
    : [...allQuestions];

  if (pool.length < count) {
    statusEl.textContent = `対象問題が不足しています。現在 ${pool.length}問、必要 ${count}問です。`;
    return;
  }

  generated = shuffle([...pool])
    .slice(0, count)
    .map((q, i) => buildQuestion(q, i + 1));

  const csvTitle = generated[0]?.title || "";
  const title = inputTitle || csvTitle || "小テスト";

  renderPaper(title, generated);
  //renderAnswers(title, generated);
  statusEl.textContent = `${title} を ${generated.length}問作成しました。`;
}

function buildQuestion(q, no) {
  const wrongIndexes = q.choices.map((_, i) => i).filter((i) => i !== q.answerIndex);
  const pickedWrong = shuffle([...wrongIndexes]).slice(0, 2);
  const shownIndexes = shuffle([q.answerIndex, ...pickedWrong]);

  const shownChoices = shownIndexes.map((idx) => ({
    originalIndex: idx,
    text: q.choices[idx]
  }));

  const correctDisplayIndex = shownIndexes.indexOf(q.answerIndex);

  return {
    no,
    title: q.title,
    field_no: q.field_no,
    question_no: q.question_no,
    question: q.question,
    shownChoices,
    correctDisplayIndex,
    correctText: q.choices[q.answerIndex]
  };
}

function renderPaper(title, items) {
  const labels = ["ア", "イ", "ウ"];

  let densityClass = "density-normal";
  if (items.length >= 9) {
    densityClass = "density-tight";
  } else if (items.length >= 7) {
    densityClass = "density-compact";
  }

  paperArea.className = `preview-sheet ${densityClass}`;

  paperArea.innerHTML = `
    <h1 class="paper-title">${escapeHtml(title)}</h1>

    <div class="test-info single-line">
      <div>組：<span class="test-line class-line"></span></div>
      <div>番号：<span class="test-line no-line"></span></div>
      <div>氏名：<span class="test-line name-line"></span></div>
      <div>得点：<span class="score-box"></span> 点</div>
    </div>

    ${items.map((item) => `
      <div class="question">
  <div class="answer-row">
    <div class="answer-box answer-box-filled">
      ${labels[item.correctDisplayIndex]}
    </div>
    <div>
      <strong>${item.no}.</strong>
      <span class="question-title-inline">${escapeHtml(item.title)}</span>
      ${escapeHtml(item.question)}
    </div>
  </div>

        ${item.shownChoices.map((c, i) => `
          <div class="choice">${labels[i]}　${escapeHtml(c.text)}</div>
        `).join("")}
      </div>
    `).join("")}
  `;
}

function renderAnswers(title, items) {
  const labels = ["ア", "イ", "ウ"];

  let densityClass = "density-normal";
  if (items.length >= 9) {
    densityClass = "density-tight";
  } else if (items.length >= 7) {
    densityClass = "density-compact";
  }

  answerArea.className = `preview-sheet ${densityClass}`;

  answerArea.innerHTML = `
    <h1 class="paper-title">${escapeHtml(title)} 解答</h1>

    ${items.map((item) => `
      <div class="question">
        <div>
          <strong>${item.no}.</strong>
          <span class="question-title-inline">${escapeHtml(item.title)}</span>
          ${escapeHtml(item.question)}
        </div>
        <div class="answer-line">正解：${labels[item.correctDisplayIndex]}（${escapeHtml(item.correctText)}）</div>
      </div>
    `).join("")}
  `;
}

function printMode(mode) {
  if (!generated.length) {
    statusEl.textContent = "先に問題を作成してください。";
    return;
  }

  const paperCard = document.querySelectorAll(".card")[3];
  const answerCard = document.querySelectorAll(".card")[4];

  if (mode === "questions") {
    answerCard.classList.add("hidden-print");
    paperCard.classList.remove("hidden-print");
  } else {
    paperCard.classList.add("hidden-print");
    answerCard.classList.remove("hidden-print");
  }

  window.print();

  paperCard.classList.remove("hidden-print");
  answerCard.classList.remove("hidden-print");
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

loadCsv();
