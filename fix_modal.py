import re

# Fix data-source-panel.ts
with open('name-tbd/src/app/editor/data-source-panel/data-source-panel.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("this.modal.open(ConnectDataModal, connectionId).closed.then((sourceId: any) => {", 
                          "this.modal.open(ConnectDataModal, { data: connectionId }).afterClosed().subscribe((sourceId: any) => {")
# Fix the bracket matching... Actually, replacing .closed.then with .afterClosed().subscribe
content = content.replace("this.modal.open(ConnectDataModal, connectionId).afterClosed().subscribe((sourceId: any) => {", 
                          "this.modal.open(ConnectDataModal, { data: connectionId }).afterClosed().subscribe((sourceId: any) => {")

with open('name-tbd/src/app/editor/data-source-panel/data-source-panel.ts', 'w', encoding='utf-8') as f:
    f.write(content)


# Fix data-source-list.ts
with open('name-tbd/src/app/editor/data-source-list/data-source-list.ts', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("await this.modal.open(ConnectDataModal, undefined).closed;", 
                          "await import('rxjs').then(m => m.firstValueFrom(this.modal.open(ConnectDataModal, { data: undefined }).afterClosed()));")
with open('name-tbd/src/app/editor/data-source-list/data-source-list.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix connect-data-modal.ts
with open('name-tbd/src/app/editor/connect-data-modal/connect-data-modal.ts', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("this.modalRef.data", "this.modalRef.config.data")
with open('name-tbd/src/app/editor/connect-data-modal/connect-data-modal.ts', 'w', encoding='utf-8') as f:
    f.write(content)
