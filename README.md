# Rehab Daily

A daily rehabilitation schedule management application designed to help therapists and staff organize patient appointments and treatments efficiently.

## Features

- **Daily Schedule View**: A clear, interactive grid to view and manage patient slots for the day.
- **Patient Management**:
    - Add, edit, and delete patient records.
    - Store contact information, treatment frequency, and other details.
    - Quick-access "Patient Palette" for easy scheduling.
- **Smart Scheduling Tools**:
    - **Copy Yesterday**: Quickly replicate the previous day's schedule to save time.
    - **Clear Day**: Reset the current day's schedule with a single click.
- **Data Portability**: Import and export patient data (JSON format) to share or backup.
- **Mobile-First Design**: Optimized for mobile devices with a clean, responsive interface using DaisyUI.

## Tech Stack

- **Frontend Framework**: [Svelte 5](https://svelte.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [DaisyUI 5](https://daisyui.com/) (Winter Theme)

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or bun

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rehab-daily
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

## Usage

- **Navigation**: Use the header sidebar (hamburger menu) to access global actions like "Copy Yesterday" or "Clear Today".
- **Adding Patients**: Use the "+" button in the Patient Palette to register new patients.
- **Scheduling**: Assign patients to specific time slots in the grid.
- **Exporting/Importing**: Use the provided tools in the patient list to backup your patient list or migrate data.

## 治疗次数与备注

- 编辑患者的顺序为：姓名、联系方式、诊断、日期、次数、备注，其后保留费用、类别等设置。
- 日期填写本疗程开具日期，次数填写开具总次数；剩余次数根据该日期起的已完成预约自动计算，无需每天修改总次数。
- 门诊患者必须填写日期和总次数；住院患者允许只填写日期、次数留空。顶部患者标签显示所有历史已完成治疗的累计次数，切换日期不改变累计值；患者信息中同时保留当日统计。未做、待治疗和连续时间格不会重复计数。
- 顶部“本月费用”按当前所选日期的自然月统计（单次费用 × 当月已完成治疗次数），不跨月或跨年累计；累计治疗次数仍包括所有历史月份。
- 默认在预约结束后计为已完成，结束前不可提前标记完成。30 分钟计 1 次治疗、60 分钟计 2 次，按预约时长计算且不重复累计连续时间格。旧版本提前标记的未来预约也不会计入已做次数。
- 未做的预约请在预约详情点击“标记未做（不扣次）”；备注可补充请假原因，仅填写备注不会改变统计。误标后可恢复自动统计或标记已完成。
- 复制昨日只复制排班，不复制已完成或未做状态。未来和进行中的预约不扣次；历史统计与工作量统计同样排除未做和待治疗预约。
- 原“日期/次数”文字原样保留。旧患者需核对并填写本疗程日期和总次数后启用自动统计，原诊断内容不会被自动拆分或覆盖。
- 单元测试：`npm run test:unit`。浏览器测试：`npm test`；也可设置 `PLAYWRIGHT_CHANNEL=msedge` 使用已安装的 Edge。

## Project Structure

- `src/App.svelte`: Main application component and layout.
- `src/components/`: Reusable UI components (Header, ScheduleGrid, PatientPalette).
- `src/components/modals/`: Modal dialogs for forms and details.
- `src/lib/store.js`: State management, data persistence, and utility logic.
