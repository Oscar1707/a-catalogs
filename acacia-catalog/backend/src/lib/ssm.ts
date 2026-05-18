// backend/src/lib/ssm.ts
// Cliente SSM con cache en módulo (sobrevive entre invocaciones del mismo
// contenedor Lambda — evita pagar GetParameter en cada request).

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

// Cache por nombre de parámetro
const cache: Map<string, string> = new Map();

export async function getSecureParameter(name: string): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;

  const res = await ssm.send(new GetParameterCommand({
    Name:           name,
    WithDecryption: true,
  }));

  const value = res.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter ${name} no encontrado`);

  cache.set(name, value);
  return value;
}

// Para tests o forzar refresh de un parámetro
export function clearSsmCache(): void {
  cache.clear();
}
