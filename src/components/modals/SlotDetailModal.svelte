<script>
  import { clearSlot, currentDate, schedule, patientProgress, treatmentClock, setTreatmentStatus } from "../../lib/store";
  import { treatmentStatus, statusLabels, canCompleteTreatment, treatmentUnits } from "../../lib/treatments.js";
  import { fade, fly } from "svelte/transition";

  export let isOpen = false;
  /**
   * @typedef {Object} Patient
   * @property {string} name
   * @property {string} type
   * @property {string} color
   * @property {string} id
   * @property {string} [notes]
   */

  /**
   * @typedef {Object} Slot
   * @property {number} duration
   */

  /**
   * @typedef {Object} SlotData
   * @property {string} time
   * @property {Slot} slot
   * @property {Patient} [patient]
   */

  /** @type {SlotData | null} */
  export let slotData = null; // { time, slot, patient }
  export let onClose = () => {};

  $: liveSlot = slotData ? $schedule[$currentDate]?.[slotData.time] : null;
  $: headTime = liveSlot?.isHead ? slotData?.time : liveSlot?.headTime;
  $: headSlot = $schedule[$currentDate]?.[headTime];
  $: status = headSlot ? treatmentStatus($currentDate, headTime, headSlot, $treatmentClock) : 'scheduled';
  $: progress = $patientProgress[slotData?.patient?.id];
  $: canComplete = headSlot && canCompleteTreatment($currentDate, headTime, headSlot, $treatmentClock);
  const handleStatus = (value) => {
    if (!slotData) return;
    if (setTreatmentStatus($currentDate, slotData.time, value) === false) return;
    onClose();
  };

  const handleDelete = () => {
    if (slotData) {
      clearSlot($currentDate, slotData.time);
      onClose();
    }
  };

  const ClockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline mb-0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
</script>

{#if isOpen && slotData}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    in:fade={{ duration: 200 }}
    on:click|self={onClose}
    on:keydown={(e) => e.key === "Escape" && onClose()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- Content -->
    <div
      class="bg-base-100 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      in:fly={{ y: 20, duration: 300 }}
      role="document"
      tabindex="-1"
    >
      <!-- Header Color Strip -->
      <div class="h-2 w-full {slotData.patient?.color || 'bg-base-300'}"></div>

      <div class="p-6 space-y-4">
        <!-- Title -->
        <div>
          <h3 class="text-xl font-bold">{slotData.patient?.name}</h3>
          <p class="text-base-content/60 font-medium">
            {slotData.patient?.type || "无详情"}
          </p>
        </div>

        <!-- Info Badge -->
        <div class="flex items-center gap-2">
          <div class="badge badge-lg badge-ghost gap-2 pl-1.5">
            {@html ClockIcon}
            <span class="font-mono">{slotData.time}</span>
            <span>•</span>
            <span>{slotData.slot.duration} 分钟</span>
            <span>· {treatmentUnits(slotData.slot)} 次治疗</span>
          </div>
        </div>

        <!-- Actions -->
        <p class="font-medium">治疗状态：{statusLabels[status]}</p>
        {#if progress}<p class="font-bold text-primary">剩余 {progress.remaining} 次 / 共 {progress.total} 次</p>{/if}
        {#if slotData.patient?.notes}<p class="text-sm whitespace-pre-wrap">备注：{slotData.patient.notes}</p>{/if}
        <p class="text-sm text-base-content/60">30 分钟计 1 次，60 分钟计 2 次。预约结束后自动计为已做，不能提前标记完成；未做请标记以恢复次数。</p>
        <div class="flex flex-col gap-3 pt-2">
          {#if status !== 'completed'}
            <button class="btn btn-primary w-full" disabled={!canComplete} on:click={() => handleStatus('completed')}>标记已完成</button>
            {#if !canComplete}<p class="text-sm text-base-content/60">预约尚未结束，不能提前标记已完成。</p>{/if}
          {/if}
          {#if status !== 'missed'}
            <button class="btn btn-warning btn-outline w-full" on:click={() => handleStatus('missed')}>标记未做（不扣次）</button>
          {/if}
          {#if headSlot?.status && headSlot.status !== 'scheduled'}
            <button class="btn btn-outline w-full" on:click={() => handleStatus('scheduled')}>恢复自动统计</button>
          {/if}
          <button
            class="btn btn-error btn-outline w-full"
            on:click={handleDelete}
          >
            删除预约
          </button>
          <button class="btn btn-ghost w-full" on:click={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
