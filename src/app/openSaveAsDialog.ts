export function openSaveAsDialog(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const element = document.createElement("a");
  element.href = url;
  element.download = fileName;
  const clickEvent = new MouseEvent("click");
  element.dispatchEvent(clickEvent);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  (<any>document).dummySaveAsElementHolder = element;
}
