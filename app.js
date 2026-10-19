document.addEventListener('DOMContentLoaded', () => {
  const statusElement = document.getElementById('status-indicator');
  if (statusElement) {
    statusElement.textContent = 'Operativo y Listo';
    statusElement.classList.add('status-online');
  }
});
