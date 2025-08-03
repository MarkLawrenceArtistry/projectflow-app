import { store } from './store.js';

const MS_IN_DAY = 1000 * 60 * 60 * 24;

class Gantt {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.zoomLevel = 'day';
        this.activePhaseId = null;
        this.project = null;
    }

    render(project) {
        this.project = project;
        this.container.innerHTML = `
            <div class="gantt-body">
                <div class="gantt-zoom-controls">
                    <button class="btn" data-zoom="day">Day</button>
                    <button class="btn" data-zoom="week">Week</button>
                    <button class="btn" data-zoom="month">Month</button>
                </div>
                <div class="gantt-timeline-wrapper">
                    <div id="gantt-grid-container"></div>
                </div>
            </div>
            <div id="gantt-edit-form-container" class="gantt-edit-form-container"></div>
        `;
        this.gridContainer = this.container.querySelector('#gantt-grid-container');
        this.formContainer = this.container.querySelector('#gantt-edit-form-container');
        this.addEventListeners();
        this.drawChart();
    }
    
    addEventListeners() {
        this.container.querySelector('.gantt-zoom-controls').addEventListener('click', e => {
            const zoomBtn = e.target.closest('button[data-zoom]');
            if (zoomBtn) { this.zoomLevel = zoomBtn.dataset.zoom; this.drawChart(); }
        });
        this.gridContainer.addEventListener('click', e => {
            const bar = e.target.closest('.gantt-phase-bar');
            const deleteBtn = e.target.closest('.gantt-delete-btn');
            if (deleteBtn) {
                e.stopPropagation();
                if(confirm('Delete this phase?')) { store.deleteGanttPhase(deleteBtn.dataset.id); this.formContainer.classList.remove('visible'); this.drawChart(); }
            } else if (bar) { this.showEditForm(bar.dataset.id); }
        });
    }

    drawChart() {
        this.gridContainer.innerHTML = '';
        this.container.querySelectorAll('.gantt-zoom-controls button').forEach(b => b.classList.remove('active'));
        this.container.querySelector(`button[data-zoom="${this.zoomLevel}"]`).classList.add('active');
        
        const { ganttPhases } = this.project;
        if (!ganttPhases || ganttPhases.length === 0) { this.gridContainer.innerHTML = `<p style="padding: 20px;">No phases created for this project.</p>`; return; }

        const dates = ganttPhases.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
        const minDate = new Date(Math.min.apply(null, dates));
        const maxDate = new Date(Math.max.apply(null, dates));

        const headerInfo = this.getTimelineHeaderInfo(minDate, maxDate);
        if (!headerInfo) return;
        const chartWidth = headerInfo.labels.length * headerInfo.unitWidth;

        const header = this.createTimelineHeader(headerInfo, chartWidth);
        const grid = this.createGrid(ganttPhases, headerInfo, chartWidth);
        
        this.gridContainer.append(header, grid);
        if (this.activePhaseId) this.highlightActiveBar();
    }
    
    getTimelineHeaderInfo(minDate, maxDate) {
        let labels = [], unitWidth = 0;
        const tempDate = new Date(minDate);
        if(isNaN(tempDate.getTime())) return null;

        switch(this.zoomLevel) {
            case 'week':
                unitWidth = 70; tempDate.setDate(tempDate.getDate() - tempDate.getDay());
                while (tempDate <= maxDate) { labels.push({ start: new Date(tempDate), label: `${tempDate.getDate()} ${tempDate.toLocaleString('default',{month:'short'})}` }); tempDate.setDate(tempDate.getDate() + 7); }
                break;
            case 'month':
                unitWidth = 150; tempDate.setDate(1);
                while (tempDate <= maxDate) { labels.push({ start: new Date(tempDate), label: tempDate.toLocaleString('default',{month:'long', year:'numeric'})}); tempDate.setMonth(tempDate.getMonth() + 1); }
                break;
            default:
                unitWidth = 40;
                while (tempDate <= maxDate) { labels.push({ start: new Date(tempDate), label: `${tempDate.getDate()}${tempDate.toLocaleString('default',{month:'short'})}` }); tempDate.setDate(tempDate.getDate() + 1); }
        }
        return { labels, unitWidth, startDate: labels[0].start };
    }
    
    createTimelineHeader({ labels, unitWidth }, chartWidth) { const h = document.createElement('div'); h.className = 'gantt-timeline-header'; h.style.width = `${chartWidth}px`; labels.forEach(l => { const u = document.createElement('div'); u.className = 'gantt-timeline-unit'; u.style.width = `${unitWidth}px`; u.textContent = l.label; h.appendChild(u); }); return h; }
    
    createGrid(phases, { unitWidth, startDate }, chartWidth) {
        const grid = document.createElement('div'); grid.className = 'gantt-grid'; grid.style.width = `${chartWidth}px`; grid.style.height = `${(phases.length * 50) + 20}px`; grid.style.backgroundSize = `${unitWidth}px 100%`;
        phases.forEach((phase, index) => {
            const phaseStart = new Date(phase.startDate), phaseEnd = new Date(phase.endDate);
            const offsetDays = (phaseStart - startDate) / MS_IN_DAY, durationDays = (phaseEnd - phaseStart) / MS_IN_DAY + 1;
            const daysPerUnit = this.zoomLevel==='week'?7:this.zoomLevel==='month'?30.44:1;
            const left = (offsetDays/daysPerUnit)*unitWidth, width = (durationDays/daysPerUnit)*unitWidth-2;
            const bar = document.createElement('div'); bar.className='gantt-phase-bar'; bar.dataset.id=phase.id; bar.style.cssText=`top:${index*50+10}px;left:${left}px;width:${width}px;background-color:${phase.color};`; bar.innerHTML=`<span class="gantt-phase-name">${phase.name}</span><button class="gantt-delete-btn" data-id="${phase.id}">×</button>`; grid.appendChild(bar);
        });
        return grid;
    }

    showEditForm(phaseId) {
        this.activePhaseId = this.activePhaseId === phaseId ? null : phaseId;
        this.highlightActiveBar();
        if (!this.activePhaseId) { this.formContainer.classList.remove('visible'); return; }
        const phase = store.getGanttPhase(phaseId); if (!phase) return;
        this.formContainer.innerHTML = `<form id="gantt-edit-form" class="card"><h3>Edit Phase</h3><div class="form-group"><label for="gantt-name">Name</label><input type="text" id="gantt-name" class="form-input" value="${phase.name}" required></div><div style="display:flex;gap:16px;align-items:center;"><div class="form-group" style="flex:1"><label for="gantt-start">Start Date</label><input type="date" id="gantt-start" class="form-input" value="${phase.startDate}" required></div><div class="form-group" style="flex:1"><label for="gantt-end">End Date</label><input type="date" id="gantt-end" class="form-input" value="${phase.endDate}" required></div><div class="form-group"><label for="gantt-color">Color</label><input type="color" id="gantt-color" value="${phase.color}"></div></div><button type="submit" class="btn btn-primary">Save Changes</button></form>`;
        this.formContainer.classList.add('visible');
        document.getElementById('gantt-edit-form').addEventListener('submit', e => { e.preventDefault(); const d = { name: document.getElementById('gantt-name').value, startDate: document.getElementById('gantt-start').value, endDate: document.getElementById('gantt-end').value, color: document.getElementById('gantt-color').value, }; store.updateGanttPhase(phaseId, d); this.drawChart(); });
    }

    highlightActiveBar() { this.gridContainer.querySelectorAll('.gantt-phase-bar').forEach(b => b.classList.remove('active')); if(this.activePhaseId){const a=this.gridContainer.querySelector(`.gantt-phase-bar[data-id="${this.activePhaseId}"]`);if(a)a.classList.add('active');}}
    async print(){const e=this.container;if(!e||!window.html2canvas)return;try{const t=await html2canvas(e,{backgroundColor:null});const n=document.createElement("a");n.download="gantt-chart.png",n.href=t.toDataURL("image/png"),n.click()}catch(e){console.error(e)}}
}
export const gantt = new Gantt('gantt-chart-container');