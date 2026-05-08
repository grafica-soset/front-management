# API CRUD — Usuários, Papéis, Clientes e Máquinas

Documentação dos endpoints REST para os módulos de **Usuários**, **Papéis**, **Clientes** e **Máquinas**.

- **Base URL (dev):** `http://localhost:5000`
- **Content-Type:** `application/json`

Todos os módulos seguem o padrão CRUD definido nas diretrizes do projeto:

| Operação  | Método | Path                | Resposta principal                  |
|-----------|--------|---------------------|-------------------------------------|
| Listar    | GET    | `/{recurso}`        | `KeyValueDto[]` (`id`, `value`)     |
| Paginar   | GET    | `/{recurso}/page`   | `PageResponse<T>`                   |
| Obter     | GET    | `/{recurso}/{id}`   | DTO completo do recurso             |
| Criar     | POST   | `/{recurso}`        | `201 Created` + DTO + `Location`    |
| Editar    | PUT    | `/{recurso}/{id}`   | DTO atualizado                      |
| Deletar   | DELETE | `/{recurso}/{id}`   | `204 No Content`                    |

## Tipos auxiliares

### `KeyValueDto`
```json
{ "id": 1, "value": "Razão / Nome" }
```

### `PageResponse<T>`
```json
{
  "content": [ /* T[] */ ],
  "page": 0,
  "size": 20,
  "totalElements": 134,
  "totalPages": 7
}
```

### `PersonDto` (compartilhado por Usuário e Cliente)
```json
{
  "name": "Empresa X",
  "corporateName": "Empresa X Ltda.",
  "document": "12345678000199",
  "email": "contato@empresax.com",
  "stateRegistration": null,
  "municipalRegistration": null,
  "suframaRegistration": null,
  "isFinalConsumer": false,
  "icmsTaxpayerIndicator": "NON_TAXPAYER"
}
```
- `icmsTaxpayerIndicator`: `TAXPAYER` | `NON_TAXPAYER` | `EXEMPT`
- `name` e `document` são obrigatórios; `email` quando informado deve ser válido.

---

## 1. Usuários — `/users`

`UserRole`: `ADMIN` | `MANAGER` | `OPERATOR` | `SELLER`

### 1.1 Listar usuários
`GET /users`

| Query    | Tipo    | Descrição                          |
|----------|---------|------------------------------------|
| `name`   | string  | Filtra por nome (opcional)         |
| `active` | boolean | Filtra por status ativo (opcional) |

**Resposta `200 OK`** — `KeyValueDto[]` (`value` = nome da pessoa).

### 1.2 Paginar usuários
`GET /users/page`

| Query    | Tipo    | Default | Descrição           |
|----------|---------|---------|---------------------|
| `page`   | int     | `0`     | Página (zero-based) |
| `size`   | int     | `20`    | Tamanho da página   |
| `name`   | string  | —       | Filtro opcional     |
| `active` | boolean | —       | Filtro opcional     |

**Resposta `200 OK`** — `PageResponse<UserResponse>`.

### 1.3 Obter usuário
`GET /users/{id}`

```json
{
  "id": 1,
  "person": { "...": "PersonDto" },
  "username": "ana.silva",
  "role": "MANAGER",
  "active": true
}
```

### 1.4 Criar usuário
`POST /users`

**Body — `CreateUserRequest`**
```json
{
  "person": {
    "name": "Ana Silva",
    "document": "12345678901",
    "email": "ana@soset.com.br",
    "icmsTaxpayerIndicator": "NON_TAXPAYER"
  },
  "username": "ana.silva",
  "password": "SenhaForte123",
  "role": "MANAGER",
  "active": true
}
```

**Validações**
- `username`: 3 a 80 caracteres.
- `password`: 8 a 255 caracteres.
- `role`: obrigatório.

**Resposta `201 Created`** — header `Location: /users/{id}`, body `UserResponse`.

### 1.5 Editar usuário
`PUT /users/{id}`

**Body — `UpdateUserRequest`**
```json
{
  "person": { "...": "PersonDto" },
  "username": "ana.silva",
  "password": "NovaSenha123",
  "role": "MANAGER",
  "active": true
}
```
- `password` é opcional. Quando ausente, mantém o hash atual.

### 1.6 Deletar usuário
`DELETE /users/{id}` → `204 No Content`.

---

## 2. Papéis — `/papers`

`UnitOfMeasure`: `SHEET` | `KG` | `UN` | `LITERS` | `METER` | `BOX` | `PACKAGE`.

### 2.1 Listar papéis
`GET /papers`

| Query    | Tipo   | Descrição               |
|----------|--------|-------------------------|
| `name`   | string | Filtra por nome do SKU  |
| `typeId` | long   | Filtra por tipo de papel|

### 2.2 Paginar papéis
`GET /papers/page` — mesmas regras de `page/size` + filtros `name`/`typeId`.

### 2.3 Obter papel
`GET /papers/{id}` — `PaperResponse`:
```json
{
  "id": 10,
  "sku": { "id": 22, "code": "PPL-75-A4", "name": "Sulfite 75g A4", "unitOfMeasure": "SHEET" },
  "type": { "id": 3, "name": "Sulfite", "description": "Papel sulfite branco" },
  "supplier": { "...": "PersonDto opcional" },
  "isEnvelope": false,
  "formatWidth": 210.0,
  "formatHeight": 297.0,
  "thicknessUm": 90.0,
  "grammageG": 75.0,
  "pricePerKg": 12.50,
  "pricePerSheet": 0.10
}
```

### 2.4 Criar papel
`POST /papers` — body `CreatePaperRequest` (igual ao `PaperResponse` sem `id` e com `typeId` *ou* `typeName`+`typeDescription`).

### 2.5 Editar papel
`PUT /papers/{id}` — exige `skuCode`, `typeId` e `typeName`.

### 2.6 Deletar papel
`DELETE /papers/{id}` → `204 No Content`.

---

## 3. Clientes — `/customers`

### 3.1 Listar / 3.2 Paginar
`GET /customers` e `GET /customers/page` — filtros `name` e `active`.

### 3.3 Obter cliente
`GET /customers/{id}` — `CustomerResponse`:
```json
{
  "id": 5,
  "person": { "...": "PersonDto" },
  "creditLimit": 5000.00,
  "active": true
}
```

### 3.4 Criar cliente
`POST /customers`
```json
{
  "person": {
    "name": "Indústria ACME",
    "corporateName": "Indústria ACME S.A.",
    "document": "12345678000199",
    "email": "compras@acme.com",
    "icmsTaxpayerIndicator": "TAXPAYER"
  },
  "creditLimit": 5000.00,
  "active": true
}
```

### 3.5 Editar cliente
`PUT /customers/{id}` — mesmo formato do `Create`.

### 3.6 Deletar cliente
`DELETE /customers/{id}` → `204 No Content`.

---

## 4. Máquinas — `/machines`

Recurso com **criação em cascata** das entidades complementares:
- `MachineTechnicalSpecs` (1:1) — capacidades de impressão e setup.
- `MachineDimensions` (1:1) — limites de folha, área imprimível e gramatura.

A exclusão é **soft delete** (`active = false`). `GET /machines` retorna apenas máquinas com `active = true`.

### 4.1 Tipos auxiliares

#### `MachineTechnicalSpecsDto`
```json
{
  "maxColors": 4,
  "minSpeed": 4000,
  "maxSpeed": 15000,
  "cruisingSheets": 12000,
  "setupTimeMinutes": 30,
  "cleaningTimeMinutes": 15,
  "makereadyWasteSheets": 200,
  "requiresPlate": true,
  "requiresPhotolith": false,
  "platesPerColor": 1,
  "photolithsPerColor": 0
}
```

| Campo                  | Tipo    | Validação | Descrição                                       |
|------------------------|---------|-----------|-------------------------------------------------|
| `maxColors`            | int     | `>= 1`    | Número máximo de cores por passada              |
| `minSpeed`             | int     | `>= 0`    | Velocidade mínima (folhas/hora)                 |
| `maxSpeed`             | int     | `>= 0`    | Velocidade máxima (folhas/hora)                 |
| `cruisingSheets`       | int     | `>= 0`    | Velocidade de cruzeiro recomendada              |
| `setupTimeMinutes`     | int     | `>= 0`    | Tempo médio de acerto inicial (min)             |
| `cleaningTimeMinutes`  | int     | `>= 0`    | Tempo médio de limpeza (min)                    |
| `makereadyWasteSheets` | int     | `>= 0`    | Folhas perdidas no acerto                       |
| `requiresPlate`        | boolean | —         | Exige chapa para impressão                      |
| `requiresPhotolith`    | boolean | —         | Exige fotolito para impressão                   |
| `platesPerColor`       | int     | `>= 0`    | Quantidade de chapas necessárias por cor        |
| `photolithsPerColor`   | int     | `>= 0`    | Quantidade de fotolitos necessários por cor     |

> Regra de domínio: `maxSpeed >= minSpeed`.

#### `MachineDimensionsDto`
```json
{
  "maxSheetWidthMm": 740.00,
  "maxSheetHeightMm": 1050.00,
  "minSheetWidthMm": 280.00,
  "minSheetHeightMm": 400.00,
  "maxPrintableWidthMm": 720.00,
  "maxPrintableHeightMm": 1040.00,
  "gripperMarginMm": 10.00,
  "minGrammageG": 60.00,
  "maxGrammageG": 450.00
}
```

| Campo                   | Tipo    | Validação        | Descrição                                  |
|-------------------------|---------|------------------|--------------------------------------------|
| `maxSheetWidthMm`       | decimal | `>= 0`           | Largura máxima de folha (mm)               |
| `maxSheetHeightMm`      | decimal | `>= 0`           | Altura máxima de folha (mm)                |
| `minSheetWidthMm`       | decimal | `>= 0`           | Largura mínima de folha (mm)               |
| `minSheetHeightMm`      | decimal | `>= 0`           | Altura mínima de folha (mm)                |
| `maxPrintableWidthMm`   | decimal | `>= 0`           | Largura máxima imprimível (mm)             |
| `maxPrintableHeightMm`  | decimal | `>= 0`           | Altura máxima imprimível (mm)              |
| `gripperMarginMm`       | decimal | `>= 0`           | Margem de pinça (mm)                       |
| `minGrammageG`          | decimal | `>= 0`           | Gramatura mínima suportada (g/m²)          |
| `maxGrammageG`          | decimal | `>= 0`           | Gramatura máxima suportada (g/m²)          |

> Regras de domínio: `maxSheetWidthMm >= minSheetWidthMm`, `maxSheetHeightMm >= minSheetHeightMm`, `maxGrammageG >= minGrammageG`.

### 4.2 Listar máquinas (apenas ativas)
`GET /machines`

| Query    | Tipo   | Descrição              |
|----------|--------|------------------------|
| `name`   | string | Filtra por nome (opcional) |

**Resposta `200 OK`** — `KeyValueDto[]` (`value` = `name`).
```json
[
  { "id": 1, "value": "Heidelberg SM 74" },
  { "id": 2, "value": "Komori Lithrone 26" }
]
```

### 4.3 Paginar máquinas
`GET /machines/page`

| Query    | Tipo    | Default | Descrição                                 |
|----------|---------|---------|-------------------------------------------|
| `page`   | int     | `0`     | Página (zero-based)                       |
| `size`   | int     | `20`    | Tamanho da página                         |
| `name`   | string  | —       | Filtro opcional                           |
| `active` | boolean | —       | Filtro opcional (inclui inativas se `false`) |

**Resposta `200 OK`** — `PageResponse<MachineResponse>`.

### 4.4 Obter máquina
`GET /machines/{id}`

**Resposta `200 OK`** — `MachineResponse`:
```json
{
  "id": 1,
  "name": "Heidelberg SM 74",
  "model": "SM 74",
  "manufacturer": "Heidelberg",
  "serialNumber": "HD-SM74-001",
  "hourlyRate": 250.0000,
  "powerConsumptionKwh": 38.5000,
  "operatorCount": 2,
  "active": true,
  "technicalSpecs": {
    "maxColors": 4,
    "minSpeed": 4000,
    "maxSpeed": 15000,
    "cruisingSheets": 12000,
    "setupTimeMinutes": 30,
    "cleaningTimeMinutes": 15,
    "makereadyWasteSheets": 200,
    "requiresPlate": true,
    "requiresPhotolith": false,
    "platesPerColor": 1,
    "photolithsPerColor": 0
  },
  "dimensions": {
    "maxSheetWidthMm": 740.00,
    "maxSheetHeightMm": 1050.00,
    "minSheetWidthMm": 280.00,
    "minSheetHeightMm": 400.00,
    "maxPrintableWidthMm": 720.00,
    "maxPrintableHeightMm": 1040.00,
    "gripperMarginMm": 10.00,
    "minGrammageG": 60.00,
    "maxGrammageG": 450.00
  }
}
```

### 4.5 Criar máquina
`POST /machines`

> Cria a máquina principal e, em cascata, suas entidades complementares (`MachineTechnicalSpecs` e `MachineDimensions`) reaproveitando o `id` gerado.

**Body — `CreateMachineRequest`**
```json
{
  "name": "Heidelberg SM 74",
  "model": "SM 74",
  "manufacturer": "Heidelberg",
  "serialNumber": "HD-SM74-001",
  "hourlyRate": 250.0000,
  "powerConsumptionKwh": 38.5000,
  "operatorCount": 2,
  "active": true,
  "technicalSpecs": {
    "maxColors": 4,
    "minSpeed": 4000,
    "maxSpeed": 15000,
    "cruisingSheets": 12000,
    "setupTimeMinutes": 30,
    "cleaningTimeMinutes": 15,
    "makereadyWasteSheets": 200,
    "requiresPlate": true,
    "requiresPhotolith": false,
    "platesPerColor": 1,
    "photolithsPerColor": 0
  },
  "dimensions": {
    "maxSheetWidthMm": 740.00,
    "maxSheetHeightMm": 1050.00,
    "minSheetWidthMm": 280.00,
    "minSheetHeightMm": 400.00,
    "maxPrintableWidthMm": 720.00,
    "maxPrintableHeightMm": 1040.00,
    "gripperMarginMm": 10.00,
    "minGrammageG": 60.00,
    "maxGrammageG": 450.00
  }
}
```

**Validações principais**
| Campo                 | Validação                                              |
|-----------------------|--------------------------------------------------------|
| `name`                | obrigatório, até 120 caracteres                        |
| `model`               | obrigatório, até 120 caracteres                        |
| `manufacturer`        | obrigatório, até 120 caracteres                        |
| `serialNumber`        | obrigatório, único (até 80 caracteres)                 |
| `hourlyRate`          | `>= 0` (default `0`)                                   |
| `powerConsumptionKwh` | `>= 0` (default `0`)                                   |
| `operatorCount`       | `>= 1` (default `1`)                                   |
| `active`              | default `true`                                         |
| `technicalSpecs`      | obrigatório e validado conforme tabela em **4.1**      |
| `dimensions`          | obrigatório e validado conforme tabela em **4.1**      |

**Resposta `201 Created`**
- Header `Location: /machines/{id}`
- Body: `MachineResponse` (mesmo schema de **4.4**).

**Erros**
- `400 Bad Request` — body inválido (Bean Validation).
- `409`/`422` — `serialNumber` já cadastrado (`BusinessException`).

### 4.6 Editar máquina
`PUT /machines/{id}`

> Atualiza a máquina e suas entidades 1:1. As tabelas `machine_technical_specs` e `machine_dimensions` mantêm a mesma chave (`machine_id`); o adapter aplica `updateFrom` em cascata.

**Body — `UpdateMachineRequest`** (mesmo schema do `CreateMachineRequest`)
```json
{
  "name": "Heidelberg SM 74 (Revisada)",
  "model": "SM 74",
  "manufacturer": "Heidelberg",
  "serialNumber": "HD-SM74-001",
  "hourlyRate": 280.0000,
  "powerConsumptionKwh": 38.5000,
  "operatorCount": 2,
  "active": true,
  "technicalSpecs": {
    "maxColors": 4,
    "minSpeed": 5000,
    "maxSpeed": 16000,
    "cruisingSheets": 13000,
    "setupTimeMinutes": 25,
    "cleaningTimeMinutes": 15,
    "makereadyWasteSheets": 180,
    "requiresPlate": true,
    "requiresPhotolith": false,
    "platesPerColor": 1,
    "photolithsPerColor": 0
  },
  "dimensions": {
    "maxSheetWidthMm": 740.00,
    "maxSheetHeightMm": 1050.00,
    "minSheetWidthMm": 280.00,
    "minSheetHeightMm": 400.00,
    "maxPrintableWidthMm": 720.00,
    "maxPrintableHeightMm": 1040.00,
    "gripperMarginMm": 10.00,
    "minGrammageG": 60.00,
    "maxGrammageG": 450.00
  }
}
```

**Resposta `200 OK`** — `MachineResponse`.

**Erros**
- `404 Not Found` — id inexistente.
- `409`/`422` — `serialNumber` alterado para um já em uso por outra máquina.

### 4.7 Deletar máquina (soft delete)
`DELETE /machines/{id}`

- Marca `active = false`. O registro **não** é removido fisicamente; permanece visível em `GET /machines/page?active=false` mas é excluído de `GET /machines` e `GET /machines/page` (sem `active`).

**Resposta `204 No Content`**.

**Erros**
- `404 Not Found` — id inexistente ou já inativo.

---

## Códigos de erro comuns

| Status | Quando ocorre                                                 |
|--------|---------------------------------------------------------------|
| 400    | Body inválido — falha de Bean Validation                      |
| 404    | Recurso não encontrado (`EntityNotFoundException`)            |
| 409    | Violação de regra de negócio (`BusinessException`)            |
| 422    | Falhas de unicidade detectadas pelo use case                  |
| 500    | Erro interno — registrado no Span via `recordException(e)`    |
