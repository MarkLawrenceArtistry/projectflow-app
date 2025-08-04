class UI {
    constructor(){this.loader=document.getElementById("loader"),this.mainContent=document.getElementById("main-content"),this.projectSelector=document.getElementById("project-selector"),this.dashboardContent=document.getElementById("dashboard-content"),this.teamGrid=document.getElementById("team-grid"),this.taskListPending=document.getElementById("task-list-pending"),this.taskListFinished=document.getElementById("task-list-finished"),this.milestoneList=document.getElementById("milestone-list"),this.statusList=document.getElementById("status-list"),this.riskTableContainer=document.getElementById("risk-table-container"),this.teamMemberProfileContent=document.getElementById("team-member-profile-content"),this.modal={container:document.getElementById("modal-container"),title:document.getElementById("modal-title"),body:document.getElementById("modal-body"),closeBtn:document.getElementById("modal-close-btn"),backdrop:document.querySelector(".modal-backdrop")}};
    showLoader(){this.loader.classList.add("visible")} hideLoader(){this.loader.classList.remove("visible")}
    switchView(viewId){this.mainContent.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));const viewEl=this.mainContent.querySelector(`#${viewId}-view`);if(viewEl)viewEl.classList.add("active");document.querySelectorAll(".sidebar-nav .nav-link").forEach(l=>{l.classList.remove("active");l.dataset.view===viewId&&l.classList.add("active")})}
        renderProjects(projects, activeId) {
        this.projectSelector.innerHTML = "";
        
        // This is the new, simplified logic.
        if (projects.length === 0) {
            this.projectSelector.innerHTML = "<option>No Projects Available</option>";
        } else {
            projects.forEach(p => {
                const o = document.createElement("option");
                o.value = p.id;
                o.textContent = p.name;
                if (p.id === activeId) {
                    o.selected = true;
                }
                this.projectSelector.appendChild(o);
            });
        }
    }
    clearAllDataViews(){[this.dashboardContent,this.teamGrid,this.taskListPending,this.taskListFinished,this.milestoneList,this.statusList,this.riskTableContainer].forEach(el=>el.innerHTML="")}
    renderDashboard(p){if(!p||p.tasks.length===0){this.dashboardContent.innerHTML='<div class="card"><p>No data to display. Add some tasks to get started.</p></div>';return}const t=p.tasks.length,o=p.tasks.filter(t=>t.completed).length,e=t>0?Math.round(o/t*100):0,s=p.tasks.filter(t=>!t.completed&&t.endDate&&new Date(t.endDate)<new Date()).length;this.dashboardContent.innerHTML=`<div class="dashboard-grid"><div class="card stat-card"><h3>Overall Progress</h3><p class="stat-big-number">${e}%</p><div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${e}%;"></div></div></div><div class="card stat-card"><h3>Completed Tasks</h3><p class="stat-big-number">${o} / ${t}</p><small>Total tasks completed</small></div><div class="card stat-card"><h3>Overdue Tasks</h3><p class="stat-big-number">${s}</p><small>Tasks past their end date</small></div></div>`}
    // PINPOINT: ui.js -> UI class -> renderTeam method
    renderTeam(team, tasks, currentUser) {
        if (!currentUser) return;
        
        this.teamGrid.innerHTML = !team || team.length === 0
        ? '<div class="card"><p>No team members assigned to this project.</p></div>'
        : team.map(member => {
            // Create a fallback emoji if one isn't provided
            const avatarEmoji = member.avatar || '👤';

            return `
            <div class="team-member-card card" data-id="${member.id}">
                <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
                    <div class="emoji-avatar">${avatarEmoji}</div>
                    <div style="flex-grow: 1;">
                        <h3>${member.name}</h3>
                        <p style="margin-bottom: 0;">${member.profileRole}</p>
                    </div>
                    ${currentUser.role !== 'member' ? `
                    <div class="item-actions" style="flex-shrink: 0;">
                        <button class="btn-icon edit-btn" data-tooltip="Edit Profile"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        <button class="btn-icon delete-btn" data-tooltip="Remove from Project"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>` : ''}
                </div>
            </div>`;
        }).join("");
    }
    renderAdminView(users, currentUser) {
        const content = `
        <div class="table-container">
            <table class="styled-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr data-id="${u.id}">
                            <td>${u.name}</td>
                            <td>${u.email}</td>
                            <td>${u.role}</td>
                            <td>
                                <!-- Only show actions for other users, and not for the admin themselves -->
                                ${u.id === currentUser.id ? '' : this.createItemActionsHTML("User", currentUser)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
        document.getElementById('admin-user-list').innerHTML = content;
    }
    createUserForm(user = {}) {
        const roles = ['admin', 'leader', 'member'];
        return `
        <form id="form" data-id="${user.id || ''}">
            <div class="form-group">
                <label for="name">Full Name</label>
                <input type="text" id="name" class="form-input" value="${user.name || ''}" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" class="form-input" value="${user.email || ''}" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" class="form-input" ${!user.id ? 'required' : ''} placeholder="${user.id ? 'Leave blank to keep same' : ''}">
            </div>
            <div class="form-group">
                <label for="role">Role</label>
                <select id="role" class="form-select">
                    ${roles.map(r => `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Save User</button>
        </form>`;
    }

        // PINPOINT: ui.js -> UI class (add this new method)
        renderProjectsAdminView(projects, currentUser) { // <-- Added currentUser as an argument
        const content = `
        <div class="table-container">
            <table class="styled-table">
                <thead>
                    <tr>
                        <th>Project Name</th>
                        <th style="width: 120px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${projects.map(p => `
                        <tr data-id="${p.id}">
                            <td>${p.name}</td>
                            <td>
                                <!-- THE FIX IS HERE: We call the function to create the buttons -->
                                ${this.createItemActionsHTML("Project", currentUser)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
        document.getElementById('projects-admin-list').innerHTML = content;
    }

    // PINPOINT: ui.js -> UI class (add this second new method)
    createProjectForm(project = {}) {
        return `
        <form id="form" data-id="${project.id || ''}">
            <div class="form-group">
                <label for="name">Project Name</label>
                <input type="text" id="name" class="form-input" value="${project.name || ''}" required>
            </div>
            <button type="submit" class="btn btn-primary">Save Project</button>
        </form>`;
    }
    // PINPOINT: ui.js -> UI class -> createAddMemberToProjectForm method (REPLACE IT)
        // PINPOINT: ui.js -> UI class (REPLACE this method)
    createMemberProfileForm(allUsers, teamMembers, profile = {}) {
        const teamMemberIds = teamMembers.map(tm => tm.id);
        const isEdit = !!profile.userId;

        const usersForDropdown = isEdit 
            ? allUsers.filter(u => u.id === profile.userId)
            : allUsers.filter(u => !teamMemberIds.includes(u.id));

        if (!isEdit && usersForDropdown.length === 0) {
            return `<p>All available users are already on this project team.</p>`;
        }

        return `
        <form id="form" data-id="${profile.userId || ''}">
            <div class="form-group">
                <label for="member-select">Select User</label>
                <select id="member-select" class="form-select" ${isEdit ? 'disabled' : ''}>
                    ${usersForDropdown.map(u => `<option value="${u.id}" ${profile.userId === u.id ? 'selected':''}>${u.name} (${u.role})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="role">Role in Project</label>
                <input type="text" id="role" class="form-input" value="${profile.profileRole || ''}" required placeholder="e.g., Lead Artist, Tester">
            </div>
            <div class="form-group">
                <label for="avatar">Avatar (Emoji)</label>
                <input type="text" id="avatar" class="form-input" value="${profile.avatar || '👤'}" maxlength="2" placeholder="👤">
            </div>
            <!-- THE FIX IS HERE: We render the emoji as text, not a background image -->
            <div class="form-group">
                <label>Preview</label>
                <div class="emoji-avatar" id="avatar-preview">${profile.avatar || '👤'}</div>
            </div>
            <button type="submit" class="btn btn-primary">Save Member Profile</button>
        </form>`;
    }
    renderTasks(tasks, team, currentUser) {
        // Correctly separate tasks into pending and finished lists
        const pendingTasks = tasks.filter(t => !t.completed);
        const finishedTasks = tasks.filter(t => t.completed);

        const createTaskHTML = (task) => {
            const assignee = team.find(m => m.id === task.assignedTo);
            return `<div class="task-item card" data-id="${task.id}">
                <input type="checkbox" class="task-item-checkbox" ${task.completed ? "checked" : ""}>
                <div class="task-item-info">
                    <span class="task-name ${task.completed ? "completed" : ""}">${task.name}</span>
                    <div class="task-metadata">
                        <span class="priority-pill ${task.priority.toLowerCase()}">${task.priority}</span>
                        <span>${assignee ? `👤 ${assignee.name}`: ""}</span>
                        <span>${task.category ? `📁 ${task.category}` : ""}</span>
                        <strong data-tooltip="Deadline">${this.formatDate(task.endDate, true)}</strong>
                    </div>
                </div>
                ${this.createItemActionsHTML("Task", currentUser)}
            </div>`;
        };

        this.taskListPending.innerHTML = pendingTasks.length > 0
            ? pendingTasks.map(createTaskHTML).join('')
            : '<div class="card"><p>No pending tasks.</p></div>';

        this.taskListFinished.innerHTML = finishedTasks.length > 0
            ? finishedTasks.map(createTaskHTML).join('')
            : '<div class="card"><p>No finished tasks.</p></div>';
    }
    createTaskItemHTML(task,team){const assignee=team.find(m=>m.id===task.assignedTo);return`<div class="task-item card" data-id="${task.id}"><input type="checkbox" class="task-item-checkbox" ${task.completed?"checked":""} data-tooltip="Toggle completion"><div class="task-item-info"><span class="task-name ${task.completed?"completed":""}">${task.name}</span><div class="task-metadata"><span class="priority-pill ${task.priority.toLowerCase()}">${task.priority}</span><span>${assignee?`👤 ${assignee.name}`:""}</span><span>${task.category?`📁 ${task.category}`:""}</span><strong data-tooltip="Deadline">${this.formatDate(task.endDate,!0)}</strong></div></div><div class="item-actions">${this.createItemActionsHTML("Task")}</div></div>`}
    renderMilestones(milestones, currentUser) {
        this.milestoneList.innerHTML = !milestones || milestones.length === 0
            ? '<div class="card"><p>No milestones.</p></div>'
            : milestones.sort((a,b) => new Date(a.startDate) - new Date(b.startDate))
              .map(m => `
                <div class="milestone-item card" data-id="${m.id}">
                    <div>
                        <h3>${m.name}</h3>
                        <p>${this.formatDate(m.startDate, true)} - ${this.formatDate(m.endDate, true)}</p>
                    </div>
                    ${this.createItemActionsHTML("Milestone", currentUser)}
                </div>`).join("");
    }
    renderStatus(items, currentUser) {
        this.statusList.innerHTML = !items || items.length === 0 
            ? '<div class="card"><p>No status items.</p></div>' 
            : items.map(i => `
                <div class="status-item card" data-id="${i.id}">
                    <div class="status-item-info">
                        <span class="status-item-name">${i.name}</span>
                        <span class="status-item-percentage-text">${i.progress}% Complete</span>
                    </div>
                    <div class="status-progress-bar-container">
                        <div class="status-progress-bar-fill" style="width: ${i.progress}%; background-color: ${i.color};"></div>
                    </div>
                    ${this.createItemActionsHTML("Status Item", currentUser)}
                </div>
            `).join('');
    }
        // PINPOINT: ui.js -> UI class (add this new method)
    renderTeamMemberProfile(member, tasks) {
        if (!member) {
            this.teamMemberProfileContent.innerHTML = "<p>Member not found.</p>";
            return;
        }

        const completedTasks = tasks.filter(t => t.completed);
        const onTime = completedTasks.filter(t => {
            if (!t.endDate) return true;
            const due = new Date(t.endDate);
            // This is a simplified check; a real app would use the completion date
            const completedAt = new Date();
            return due >= completedAt;
        }).length;
        
        const performance = completedTasks.length > 0 ? Math.round((onTime / completedTasks.length) * 100) : 100;
        let rating, ratingClass;
        if (performance >= 90) { rating = "Excellent"; ratingClass = "excellent"; }
        else if (performance >= 70) { rating = "Good"; ratingClass = "good"; }
        else { rating = "Needs Improvement"; ratingClass = "needs-improvement"; }

        this.teamMemberProfileContent.innerHTML = `
            <header class="view-header">
                <button id="back-to-team-btn" class="btn">< Back to Team</button>
            </header>
            <div class="profile-header card">
                <div class="emoji-avatar" style="width: 100px; height: 100px; font-size: 4rem;">${member.avatar || '👤'}</div>
                <div class="profile-info">
                    <h2>${member.name}</h2>
                    <p>${member.profileRole}</p>
                    <p class="profile-rating ${ratingClass}">
                        Performance: ${rating} (${performance}%)
                    </p>
                </div>
            </div>
            <h3>Assigned Tasks (${tasks.length})</h3>
            <div class="table-container card">
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Task</th>
                            <th>Priority</th>
                            <th>Deadline</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tasks.length > 0 ? tasks.map(t => `
                        <tr>
                            <td>${t.completed ? "✅" : "⏳"}</td>
                            <td>${t.name}</td>
                            <td><span class="priority-pill ${t.priority.toLowerCase()}">${t.priority}</span></td>
                            <td>${this.formatDate(t.endDate, true)}</td>
                        </tr>`).join('') : `<tr><td colspan="4" style="text-align:center">No tasks assigned.</td></tr>`}
                    </tbody>
                </table>
            </div>`;
    }
    renderRisks(risks){let content;if(!risks||risks.length===0){content='<div class="card"><p>No risks documented.</p></div>'}else{content=`<div class="table-container card"><table class="styled-table"><thead><tr><th>Priority</th><th>Description</th><th>Impact</th><th>Actions</th></tr></thead><tbody>${risks.map(r=>`<tr><td class="priority-cell"><span class="priority-pill ${r.priority.toLowerCase()}">${r.priority}</span></td><td>${r.description}</td><td>${r.impact}</td><td><div class="item-actions" data-id="${r.id}">${this.createItemActionsHTML("Risk")}</div></td></tr>`).join("")}</tbody></table></div>`}this.riskTableContainer.innerHTML=content}
    renderTeamMemberProfile(member,tasks){if(!member){this.teamMemberProfileContent.innerHTML="<p>Member not found.</p>";return}const completedTasks=tasks.filter(t=>t.completed);const onTime=completedTasks.filter(t=>{if(!t.endDate)return!0;const due=new Date(t.endDate);const completedAt=new Date;return due>=completedAt}).length;const performance=completedTasks.length>0?Math.round(onTime/completedTasks.length*100):100;let rating,ratingClass;performance>=90?(rating="Excellent",ratingClass="excellent"):performance>=70?(rating="Good",ratingClass="good"):(rating="Needs Improvement",ratingClass="needs-improvement");this.teamMemberProfileContent.innerHTML=`<header class="view-header"><button id="back-to-team-btn" class="btn">< Back to Team</button></header><div class="profile-header card"><div class="profile-avatar">${this.createAvatarHTML(member,"team-member-avatar")}</div><div class="profile-info"><h2>${member.name}</h2><p>${member.role}</p><p class="profile-rating ${ratingClass}">${rating} Performance (${performance}%)</p></div></div><h3>Assigned Tasks (${tasks.length})</h3><div class="table-container card"><table class="styled-table"><thead><tr><th>Status</th><th>Task</th><th>Priority</th><th>Deadline</th></tr></thead><tbody>${tasks.length>0?tasks.map(t=>`<tr><td>${t.completed?"✅":"⏳"}</td><td>${t.name}</td><td><span class="priority-pill ${t.priority.toLowerCase()}">${t.priority}</span></td><td>${this.formatDate(t.endDate,!0)}</td></tr>`).join(""):`<tr><td colspan="4" style="text-align:center">No tasks assigned.</td></tr>`}</tbody></table></div>`}
    createAvatarHTML(m,c,t=""){const tt=t?`data-tooltip="${t}"`:"";return m.avatar?`<img src="${m.avatar}" alt="${m.name}" class="${c}" ${tt}>`:`<div class="${c.replace("avatar","icon-fallback")}" ${tt}><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`}
    createItemActionsHTML(type, currentUser) {
        // If there's no user or the user is a member, don't show any buttons
        if (!currentUser || currentUser.role === 'member') {
            return '';
        }
        
        // Only Admins and Leaders will see these buttons
        return `
        <div class="item-actions">
            <button class="btn-icon edit-btn" data-tooltip="Edit ${type}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn-icon delete-btn" data-tooltip="Delete ${type}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>`;
    }
    createMemberForm(m={}){return`<form id="form" data-id="${m.id}"><div class=form-group><label for=name>Name</label><input type=text id=name class=form-input value="${m.name||""}" required></div><div class=form-group><label for=role>Role</label><input type=text id=role class=form-input value="${m.role||""}" required></div><div class=form-group><label>Avatar</label><label for=avatarFile class=custom-file-upload>Choose File</label><input type=file id=avatarFile accept="image/*"><div class=avatar-preview style="background-image: url('${m.avatar||""}')"></div></div><button type=submit class="btn btn-primary">Save Member</button></form>`}
    createTaskForm(team,t={}){const priorities=["Low","Medium","High"];return`<form id="form" data-id="${t.id}"><div class=form-group><label for=name>Task Name</label><input type=text id=name class=form-input value="${t.name||""}" required></div><div class=form-group><label for=desc>Description</label><textarea id=desc class=form-input rows=2>${t.description||""}</textarea></div><div style="display:flex;gap:16px"><div class="form-group" style="flex:1"><label for=cat>Category</label><input type=text id=cat class=form-input value="${t.category||""}" placeholder="e.g., Backend"></div><div class="form-group" style="flex:1"><label for=priority>Priority</label><select id=priority class=form-select>${priorities.map(p=>`<option value=${p} ${p===(t.priority||"Medium")?"selected":""}>${p}</option>`).join("")}</select></div></div><div class=form-group><label for=assign>Assign To</label><select id=assign class=form-select><option value="">Unassigned</option>${team.map(m=>`<option value=${m.id} ${m.id===t.assignedTo?"selected":""}>${m.name}</option>`).join("")}</select></div><div style="display:flex;gap:16px"><div class="form-group" style="flex:1"><label for=start>Start Date</label><input type=date id=start class=form-input value="${t.startDate||""}" required></div><div class="form-group" style="flex:1"><label for=end>End Date</label><input type=date id=end class=form-input value="${t.endDate||""}" required></div></div><button type=submit class="btn btn-primary">Save Task</button></form>`}
    createMilestoneForm(m={}){return`<form id="form" data-id="${m.id}"><div class=form-group><label for=name>Milestone Name</label><input type=text id=name class=form-input value="${m.name||""}" required></div><div style="display:flex;gap:16px"><div class="form-group" style="flex:1"><label for=start>Start Date</label><input type=date id=start class=form-input value="${m.startDate||""}" required></div><div class="form-group" style="flex:1"><label for=end>End Date</label><input type=date id=end class=form-input value="${m.endDate||""}" required></div></div><button type=submit class="btn btn-primary">Save Milestone</button></form>`}
    createStatusForm(s={}){return`<form id="form" data-id="${s.id}"><div class=form-group><label for=name>Status Name</label><input type=text id=name class=form-input value="${s.name||""}" required></div><div class=form-group><label for=progress>Progress: <span id=progress-val>${s.progress||0}%</span></label><input type=range id=progress class=form-input value="${s.progress||0}" min=0 max=100></div><div class=form-group><label for=color>Color</label><input type=color id=color value="${s.color||"#e74c3c"}"></div><button type=submit class="btn btn-primary">Save Status</button></form>`}
    createGanttPhaseForm(p={}){return`<form id="form" data-id="${p.id}"><div class=form-group><label for=name>Phase Name</label><input type=text id=name class=form-input value="${p.name||""}" required></div><div style="display:flex;gap:16px;align-items:center;"><div class="form-group" style="flex:1"><label for=start>Start Date</label><input type=date id=start class=form-input value="${p.startDate||""}" required></div><div class="form-group" style="flex:1"><label for=end>End Date</label><input type=date id=end class=form-input value="${p.endDate||""}" required></div><div class=form-group><label for=color>Color</label><input type=color id=color value="${p.color||"#e74c3c"}"></div></div><button type=submit class="btn btn-primary">Save Phase</button></form>`}
    createRiskForm(r={}){const impacts=["Low","Medium","High","Critical"],priorities=["Low","Medium","High"];return`<form id="form" data-id="${r.id}"><div class=form-group><label for=desc>Description</label><textarea id=desc class=form-input rows=3 required>${r.description||""}</textarea></div><div style="display:flex;gap:16px;"><div class="form-group" style="flex:1"><label for=impact>Impact</label><select id=impact class=form-select>${impacts.map(i=>`<option value="${i}" ${i===(r.impact||"Medium")?"selected":""}>${i}</option>`).join("")}</select></div><div class="form-group" style="flex:1"><label for=priority>Priority</label><select id=priority class=form-select>${priorities.map(p=>`<option value="${p}" ${p===(r.priority||"Medium")?"selected":""}>${p}</option>`).join("")}</select></div></div><button type=submit class="btn btn-primary">Save Risk</button></form>`}
    formatDate(d,long=!1){if(!d)return"N/A";const t=new Date(d);return t.setMinutes(t.getMinutes()+t.getTimezoneOffset()),long?t.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):t.toLocaleDateString()}
    openModal(title,content){this.modal.title.textContent=title,this.modal.body.innerHTML=content,this.modal.container.classList.add("visible")}
    closeModal(){this.modal.container.classList.remove("visible")}
    renderTaskFilters(team, tasks) {
        const memberFilter = document.getElementById('task-filter-member');
        const categoryFilter = document.getElementById('task-filter-category');
        
        const currentMember = memberFilter.value;
        memberFilter.innerHTML = '<option value="all">All Members</option>';
        team.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            memberFilter.appendChild(option);
        });
        memberFilter.value = currentMember;

        const currentCategory = categoryFilter.value;
        const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))];
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
        categoryFilter.value = currentCategory;
    }
}
export const ui=new UI;