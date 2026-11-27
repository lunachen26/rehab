<script>
  import {
    addPatient,
    updatePatient,
    deletePatient,
    scheduleSettings,
    schedule,
    treatmentClock,
    showToast,
    currentDate,
  } from "../../lib/store";
  import { treatmentProgress, treatmentCounts, treatmentFee } from "../../lib/treatments.js";

  export let isOpen = false;
  /**
   * @typedef {Object} Patient
   * @property {string} id
   * @property {string} name
   * @property {string} type
   * @property {number} duration
   * @property {string} color
   * @property {string} [category]
   * @property {string} [contact]
   * @property {string} [frequency]
   * @property {number} [price]
   * @property {string} [treatmentDate]
   * @property {number | null} [totalSessions]
   * @property {string} [notes]
   */

  /** @type {Patient | null} */
  export let patientToEdit = null; // If passed, we are editing
  export let onClose = () => {};

  let name = "";
  let type = "";
  let duration = 30;
  let color = "bg-blue-500";
  let category = "Outpatient"; // Default
  let contact = "";
  let frequency = "";
  let price = 0;
  let treatmentDate = "";
  let totalSessions = undefined;
  let notes = "";

  $: progress = treatmentProgress({ id: patientToEdit?.id, treatmentDate, totalSessions }, $schedule, $treatmentClock);
  $: counts = treatmentCounts(patientToEdit?.id, $schedule, $currentDate, $treatmentClock);

  $: timeStep = $scheduleSettings?.timeStep || 30;

  // React to opening with data
  $: if (isOpen && patientToEdit) {
    name = patientToEdit.name;
    type = patientToEdit.type;
    duration = patientToEdit.duration;
    color = patientToEdit.color;
    category = patientToEdit.category || "Inpatient";
    contact = patientToEdit.contact || "";
    frequency = patientToEdit.frequency || "";
    price = patientToEdit.price || 0;
    treatmentDate = patientToEdit.treatmentDate || "";
    totalSessions = patientToEdit.totalSessions ?? undefined;
    notes = patientToEdit.notes || "";
  } else if (isOpen && !patientToEdit) {
    reset();
  }

  const colors = [
    { label: "蓝色", val: "bg-blue-500" },
    { label: "绿色", val: "bg-emerald-500" },
    { label: "橙色", val: "bg-amber-500" },
    { label: "红色", val: "bg-rose-500" },
    { label: "紫色", val: "bg-violet-500" },
    { label: "灰色", val: "bg-slate-500" },
  ];

  const handleSubmit = () => {
    if (!name.trim()) return;
    const hasCount = totalSessions !== undefined && totalSessions !== null && totalSessions !== "";
    if (category === 'Outpatient' && (!hasCount || !treatmentDate)) {
      showToast("门诊患者必须填写日期和次数", "error");
      return;
    }
    const incompleteCourse = category === 'Inpatient' ? hasCount && !treatmentDate : Boolean(treatmentDate) !== hasCount;
    if (incompleteCourse || (hasCount && (!Number.isInteger(Number(totalSessions)) || Number(totalSessions) < 0))) {
      showToast(category === 'Inpatient' ? "住院次数可留空；填写次数时请同时填写日期和非负整数次数" : "请同时填写日期和非负整数次数，或同时留空", "error");
      return;
    }
    if (treatmentDate && (Number.isNaN(Date.parse(treatmentDate)) || new Date(`${treatmentDate}T12:00:00`).toLocaleDateString('en-CA') !== treatmentDate)) {
      showToast("请填写有效日期", "error");
      return;
    }
    const courseFields = { treatmentDate, totalSessions: hasCount ? Number(totalSessions) : null, notes };

    if (patientToEdit) {
      updatePatient(patientToEdit.id, {
        ...courseFields,
        name,
        type,
        duration,
        color,
        category,
        contact,
        frequency,
        price: Number(price),
      });
    } else {
      addPatient({
        ...courseFields,
        name,
        type,
        duration,
        color,
        category,
        contact,
        frequency,
        price: Number(price),
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (
      confirm(
        "确定要归档此患者吗？\n\n归档后患者将不会出现在安排列表中，但可以在归档管理中恢复。",
      )
    ) {
      deletePatient(patientToEdit.id);
      onClose();
    }
  };

  const reset = () => {
    name = "";
    type = "";
    duration = timeStep;
    color = "bg-blue-500";
    category = "Outpatient";
    contact = "";
    frequency = "";
    price = 0;
    treatmentDate = "";
    totalSessions = undefined;
    notes = "";
  };
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    on:click|self={onClose}
    on:keydown={(e) => e.key === "Escape" && onClose()}
    role="button"
    tabindex="0"
  >
    <div
      class="card w-full max-w-sm bg-base-100 shadow-xl max-h-[90vh] overflow-y-auto"
      role="dialog"
      tabindex="-1"
    >
      <div class="card-body">
        <div class="flex justify-between items-center">
          <h2 class="card-title text-lg font-bold">
            {patientToEdit ? "编辑患者" : "添加患者"}
          </h2>
          {#if patientToEdit}
            <button
              class="btn btn-xs btn-outline btn-warning"
              on:click={handleDelete}>归档</button
            >
          {/if}
        </div>

        <!-- Name -->
        <div class="form-control w-full">
          <label class="label" for="p-name"
            ><span class="label-text">姓名</span></label
          >
          <input
            id="p-name"
            type="text"
            bind:value={name}
            placeholder="例如：张伟"
            class="input input-bordered w-full"
          />
        </div>

        <!-- Contact (New) -->
        <div class="form-control w-full">
          <label class="label" for="p-contact"
            ><span class="label-text">联系方式</span></label
          >
          <input
            id="p-contact"
            type="text"
            bind:value={contact}
            placeholder="电话号码或其他"
            class="input input-bordered w-full"
          />
        </div>

        <!-- Diagnosis -->
        <div class="form-control w-full">
          <label class="label" for="p-diag"><span class="label-text">诊断</span></label>
          <input id="p-diag" type="text" bind:value={type} placeholder="例如：脑卒中" class="input input-bordered w-full" />
        </div>

        <div class="form-control w-full">
          <label class="label" for="p-date"><span class="label-text">日期</span></label>
          <input id="p-date" type="date" bind:value={treatmentDate} required={category === 'Outpatient'} aria-required={category === 'Outpatient'} class="input input-bordered w-full" />
          <p class="text-sm text-base-content/60 mt-1">{category === 'Inpatient' ? '可记录住院治疗开始日期，无需填写总次数也能自动统计。' : '本疗程开具日期，从此日期起统计治疗次数。'}</p>
        </div>

        <div class="form-control w-full">
          <label class="label" for="p-sessions"><span class="label-text">次数</span></label>
          <input id="p-sessions" type="number" min="0" step="1" bind:value={totalSessions} required={category === 'Outpatient'} aria-required={category === 'Outpatient'} placeholder={category === 'Inpatient' ? '住院可不填' : '必填，例如：5'} class="input input-bordered w-full" />
          <p class="text-sm text-base-content/60 mt-1">{category === 'Inpatient' ? '住院患者次数可留空，已做次数自动统计；填写总次数后也可查看剩余次数。' : '门诊必填：本疗程日期和开具总次数。无需每天修改，历史预约也会参与统计。'}</p>
          <div class="rounded-lg bg-base-200 p-3 mt-2" aria-live="polite">
            <p class="font-medium">累计已做 {counts.completed} 次</p>
            <p class="text-sm">{$currentDate} 当日已做 {counts.dailyCompleted} 次</p>
          </div>
          {#if progress}
            <div class="rounded-lg bg-primary/10 p-3 mt-2" aria-live="polite">
              <p class="font-bold text-primary">剩余 {progress.remaining} 次</p>
              <p class="text-sm">共 {progress.total} 次 · 已做 {progress.completed} 次 · 未做 {progress.missed} 次</p>
              <p class="text-sm text-base-content/70 mt-1">预约结束后自动扣次；未做请在预约详情中标记。</p>
              {#if progress.completed > progress.total}<p class="text-sm text-warning">已做次数超过开具次数，请核对疗程日期或总次数。</p>{/if}
            </div>
          {/if}
          {#if frequency}
            <p class="text-sm text-base-content/60 mt-2">原日期/次数：{frequency}（已保留）。{category === 'Inpatient' ? '住院次数可留空，已做次数仍自动统计。' : '请核对本疗程日期和开具总次数后启用自动统计。'}</p>
          {/if}
        </div>

        <div class="form-control w-full">
          <label class="label" for="p-notes"><span class="label-text">备注</span></label>
          <textarea id="p-notes" bind:value={notes} placeholder="例如：周二请假未做；未做预约请同时在预约详情标记" class="textarea textarea-bordered w-full" rows="3"></textarea>
        </div>

        <div class="form-control w-full">
          <label class="label" for="p-price"><span class="label-text">单次费用 (元)</span></label>
          <input id="p-price" type="number" min="0" step="0.01" bind:value={price} placeholder="0" class="input input-bordered w-full" />
        </div>

        <!-- Category -->
        <div class="form-control">
          <div class="label"><span class="label-text">类别</span></div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <label class="label cursor-pointer gap-2">
              <input
                type="radio"
                bind:group={category}
                value="Outpatient"
                class="radio radio-sm"
              />
              <span class="label-text">门诊</span>
            </label>
            <label class="label cursor-pointer gap-2">
              <input
                type="radio"
                bind:group={category}
                value="Inpatient"
                class="radio radio-sm"
              />
              <span class="label-text">住院</span>
            </label>
            <span class="text-sm font-semibold tabular-nums" aria-live="polite">费用总和 ¥{treatmentFee(price, counts.completed).toFixed(2)}</span>
          </div>
          <p class="text-xs text-base-content/60 mt-1">单次费用 × 累计已做 {counts.completed} 次；30 分钟计 1 次，60 分钟计 2 次，未做和待治疗不计费。按当前单次费用计算。</p>
        </div>

        <!-- Duration -->
        <div class="form-control">
          <div class="label"><span class="label-text">默认时长</span></div>
          <p class="text-sm text-base-content/60 mb-2">30 分钟计 1 次治疗，60 分钟计 2 次治疗。</p>
          <div class="flex gap-4">
            <label
              class="label cursor-pointer gap-2 border rounded-lg px-3 py-2 flex-1 {duration ===
              timeStep
                ? 'border-primary bg-primary/5'
                : ''}"
            >
              <input
                type="radio"
                bind:group={duration}
                value={timeStep}
                class="radio radio-primary radio-sm"
              />
              <span class="label-text font-medium">{timeStep} 分钟</span>
            </label>
            <label
              class="label cursor-pointer gap-2 border rounded-lg px-3 py-2 flex-1 {duration ===
              timeStep * 2
                ? 'border-primary bg-primary/5'
                : ''}"
            >
              <input
                type="radio"
                bind:group={duration}
                value={timeStep * 2}
                class="radio radio-primary radio-sm"
              />
              <span class="label-text font-medium">{timeStep * 2} 分钟</span>
            </label>
          </div>
        </div>

        <!-- Color -->
        <div class="form-control">
          <div class="label"><span class="label-text">标签颜色</span></div>
          <div class="flex gap-2 flex-wrap">
            {#each colors as c}
              <button
                class="w-8 h-8 rounded-full {c.val} transition-transform {color ===
                c.val
                  ? 'ring-2 ring-offset-2 ring-base-content scale-110'
                  : 'opacity-70 hover:opacity-100'}"
                on:click={() => (color = c.val)}
                aria-label={c.label}
                type="button"
              ></button>
            {/each}
          </div>
        </div>

        <div class="card-actions justify-end mt-4">
          <button class="btn btn-ghost" on:click={onClose}>取消</button>
          <button class="btn btn-primary" on:click={handleSubmit}>保存</button>
        </div>
      </div>
    </div>
  </div>
{/if}
