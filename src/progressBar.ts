export function updateProgressBar(progress: number) {
  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = progress + "%";
  // progressBar.innerHTML = progress + "%";
}
