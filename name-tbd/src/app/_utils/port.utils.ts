/** Output port ids are `${nodeId}-${port}`, input port ids `${nodeId}-in`. */
export const outputPortId = (nodeId: string, port: string) => `${nodeId}-${port}`;
export const inputPortId = (nodeId: string) => `${nodeId}-in`;

/** Node ids never contain '-' (they are DB ids), so the last '-' separates the port. */
export function splitPortId(portId: string): { nodeId: string; port: string } {
  const i = portId.lastIndexOf('-');
  return { nodeId: portId.slice(0, i), port: portId.slice(i + 1) };
}
