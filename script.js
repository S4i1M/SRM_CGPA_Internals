const gradeToPoint = {
  "O": 10,
  "A+": 9,
  "A": 8,
  "B+": 7,
  "B": 6,
  "C": 5
};
function generateSubjects() {
  const num = parseInt(document.getElementById("numSubjects").value);
  const form = document.getElementById("subjectsForm");
  form.innerHTML = "";

  for (let i = 0; i < num; i++) {
    const subjectCard = document.createElement("div");
    subjectCard.className = "card mb-3";
    subjectCard.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">Subject ${i + 1}</h5>
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="grade_${i}" class="form-label">Grade</label>
            <select class="form-select" name="grade" id="grade_${i}">
              <option value="O">O</option>
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="B+">B+</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <div class="col-md-6 mb-3">
            <label for="credit_${i}" class="form-label">Credit</label>
            <input type="number" class="form-control" name="credit" id="credit_${i}" min="1" max="10" step="0.5" value="4.0" />
          </div>
        </div>
      </div>
    `;
    form.appendChild(subjectCard);
  }
}



document.getElementById("calculateBtn")?.addEventListener("click", () => {
  const prevCgpa = parseFloat(document.getElementById("prevCgpa").value);
  const prevCredits = parseFloat(document.getElementById("prevCredits").value);
  const grades = Array.from(document.getElementsByName("grade")).map(g => g.value);
  const credits = Array.from(document.getElementsByName("credit")).map(c => parseFloat(c.value));

  const gradePoints = grades.map(g => gradeToPoint[g]);
  const semesterGpa = calculateCgpa(gradePoints, credits);
  const cumulativeCgpa = calculateCgpa(gradePoints, credits, prevCgpa, prevCredits);

  document.getElementById("results").innerHTML = `
    📘 Semester GPA: <strong>${semesterGpa.toFixed(2)}</strong><br/>
    🧮 Cumulative CGPA: <strong>${cumulativeCgpa.toFixed(2)}</strong>
  `;
});

function calculateCgpa(gradePoints, credits, prevCgpa = 0, prevCredits = 0) {
  const totalCredits = credits.reduce((a, b) => a + b, 0) + prevCredits;
  const totalPoints = gradePoints.reduce((sum, gp, i) => sum + gp * credits[i], 0) + (prevCgpa * prevCredits);
  return totalPoints / totalCredits;
}

function calculateInternals() {
  const ct1Input = document.getElementById("ct1").value;
  const ct2Input = document.getElementById("ct2").value;

  if (ct1Input === "") {
    document.getElementById("internalResults").innerHTML = `
      <div class="alert alert-danger">Please enter Cycle Test 1 marks.</div>
    `;
    return;
  }

  const ct1 = parseFloat(ct1Input);
  if (ct1 < 0 || ct1 > 50) {
    document.getElementById("internalResults").innerHTML = `
      <div class="alert alert-danger">CT1 must be between 0 and 50.</div>
    `;
    return;
  }

  let ct2_scaled;
  let ct2_message;

  if (ct2Input === "") {
    ct2_scaled = 15;
    ct2_message = `<em>CT2 not entered — assuming full marks (15/15)</em>`;
  } else {
    const ct2 = parseFloat(ct2Input);
    if (ct2 < 0 || ct2 > 50) {
      document.getElementById("internalResults").innerHTML = `
        <div class="alert alert-danger">CT2 must be between 0 and 50.</div>
      `;
      return;
    }
    ct2_scaled = (ct2 / 50) * 15;
    ct2_message = `${ct2_scaled.toFixed(2)} / 15`;
  }

  const ct1_scaled = (ct1 / 50) * 15;
  const total_internal = ct1_scaled + ct2_scaled;

  document.getElementById("internalResults").innerHTML = `
    📘 CT1 Scaled: <strong>${ct1_scaled.toFixed(2)} / 15</strong><br/>
    📘 CT2 Scaled: <strong>${ct2_message}</strong><br/>
    🧮 Total Internal Marks: <strong>${total_internal.toFixed(2)} / 30</strong>
  `;
}

