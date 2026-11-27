<script>
  import { schedule, patients, archivedPatients, currentDate, treatmentClock } from "../../lib/store";
  import { treatmentStatus, treatmentUnits } from "../../lib/treatments.js";
  import { fade, fly } from "svelte/transition";

  export let isOpen = false;
  export let onClose = () => {};

  // Form inputs
  let startDate = new Date().toISOString().split("T")[0];
  let endDate = new Date().toISOString().split("T")[0];

  // Stats
  let totalIncome = 0;
  let totalVisits = 0;
  let totalTreatments = 0;
  let breakdown = []; // { patientName, count, income }

  const calculate = (scheduleData, patientData, now) => {
    totalIncome = 0;
    totalVisits = 0;
    totalTreatments = 0;
    breakdown = [];

    // Map patient ID to pricing
    const patientMap = new Map(patientData.map((p) => [p.id, p]));
    const accum = {}; // { patientId: { count: 0, income: 0 } }

    // ISO date strings allow an inclusive comparison without UTC conversion.
    Object.entries(scheduleData).forEach(([dateStr, daySchedule]) => {
      if (dateStr >= startDate && dateStr <= endDate) {
        Object.entries(daySchedule).forEach(([time, slot]) => {
          if (slot.isHead && treatmentStatus(dateStr, time, slot, now) === 'completed') {
            const pid = slot.patientId;
            const p = patientMap.get(pid);
            // If patient deleted, we might not find them. Use defaults.
            // Or maybe we should keep historical data snapshotted?
            // For now, use current patient data.
            const price = p ? Number(p.price) || 0 : 0;

            if (!accum[pid])
              accum[pid] = {
                count: 0,
                income: 0,
                name: p ? p.name : "Unknown",
              };
            accum[pid].count += treatmentUnits(slot);
            accum[pid].income += price;

            totalIncome += price;
            totalVisits += 1;
            totalTreatments += treatmentUnits(slot);
          }
        });
      }
    });

    // Convert accum to map
    breakdown = Object.values(accum).sort((a, b) => b.income - a.income);
  };

  // Re-calculate when open or dates change
  $: if (isOpen && $currentDate) {
    endDate = $currentDate;
    const [y, m, d] = $currentDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() - 1);
    startDate = date.toLocaleDateString("en-CA");
  }

  $: if (isOpen && (startDate || endDate)) {
    calculate($schedule, [...$patients, ...$archivedPatients], $treatmentClock);
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    in:fade={{ duration: 200 }}
    on:click|self={onClose}
    on:keydown={(e) => e.key === "Escape" && onClose()}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-base-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      in:fly={{ y: 20, duration: 300 }}
    >
      <div
        class="px-5 py-4 border-b border-base-200 flex items-center justify-between bg-base-100 z-10"
      >
        <h2 class="text-lg font-bold">工作量统计</h2>
        <button class="btn btn-sm btn-circle btn-ghost" on:click={onClose}
          >✕</button
        >
      </div>

      <div class="p-4 bg-base-50 border-b border-base-200">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label" for="startDate"
              ><span class="label-text">开始日期</span></label
            >
            <input
              id="startDate"
              type="date"
              bind:value={startDate}
              class="input input-sm input-bordered w-full"
            />
          </div>
          <div class="form-control">
            <label class="label" for="endDate"
              ><span class="label-text">结束日期</span></label
            >
            <input
              id="endDate"
              type="date"
              bind:value={endDate}
              class="input input-sm input-bordered w-full"
            />
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div class="stats shadow w-full mb-6 bg-primary text-primary-content">
          <div class="stat">
            <div class="stat-title text-primary-content/80">总收入</div>
            <div class="stat-value">¥{totalIncome}</div>
            <div class="stat-desc text-primary-content/70">
              共 {totalVisits} 人次
              <span> · {totalTreatments} 次治疗</span>
            </div>
          </div>
        </div>

        <h3 class="font-bold text-sm text-base-content/70 mb-3 px-1">
          收入明细
        </h3>
        {#if breakdown.length === 0}
          <div
            class="text-center py-8 text-base-content/40 border border-dashed rounded-xl"
          >
            该时间段暂无记录
          </div>
        {:else}
          <div class="space-y-2">
            {#each breakdown as item}
              <div
                class="flex items-center justify-between p-3 rounded-xl bg-base-100 border border-base-200 shadow-sm"
              >
                <div class="flex flex-col">
                  <span class="font-medium text-base-content">{item.name}</span>
                  <span class="text-xs text-base-content/50"
                    >{item.count} 次</span
                  >
                </div>
                <div class="font-bold text-lg">
                  ¥{item.income}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
