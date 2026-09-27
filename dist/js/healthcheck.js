// Vanilla client API for HealthCheck
export async function getHealthCheck() {
  const response = await fetch('/api/healthcheck');
  return response.json();
}
