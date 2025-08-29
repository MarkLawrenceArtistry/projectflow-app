


// PINPOINT: In js/app.js, at the bottom, REPLACE the existing Task class with this one.

// PINPOINT: In js/app.js, at the bottom, REPLACE the existing Task class with this one.

class Task { 
    constructor(id, name, description, assignedTo, startDate, endDate, category, priority, completed = false, acknowledged = false, progress = 0, pendingCompletion = false) { 
        this.id = id; 
        this.name = name; 
        this.description = description; 
        this.assignedTo = assignedTo; 
        this.startDate = startDate; 
        this.endDate = endDate; 
        this.category = category; 
        this.priority = priority; 
        this.completed = completed; 
        this.acknowledged = acknowledged;
        this.progress = progress;
        this.pendingCompletion = pendingCompletion;
    } 
}
class TeamMember { constructor(id, name, role, avatar) { this.id = id; this.name = name; this.role = role; this.avatar = avatar; } }
class Milestone { constructor(id, name, startDate, endDate) { this.id = id; this.name = name; this.startDate = startDate; this.endDate = endDate; } }
class StatusItem { constructor(id, name, progress, color) { this.id = id; this.name = name; this.progress = progress; this.color = color; } }
class GanttPhase { constructor(id, name, startDate, endDate, color) { this.id = id; this.name = name; this.startDate = startDate; this.endDate = endDate; this.color = color || '#e74c3c';} }
class Risk { constructor(id, description, impact, priority) { this.id = id; this.description = description; this.impact = impact; this.priority = priority; } }
class Project { constructor(id, name) { this.id = id; this.name = name; this.tasks = []; this.team = {}; this.milestones = []; this.statusItems = []; this.ganttPhases = []; this.risks = []; } }
class User { constructor(id, name, email, password, role = 'member') { this.id = id; this.name = name; this.email = email; this.password = password; this.role = role; }}
class Store {
    constructor() {
        this.db = null;
        this.app = null;
        
        this.users = [];
        this.currentUser = null;
        this.onlineUsers = []; // Add this line
        
        this.projects = [];
        this.activeProjectId = null;
        this.dataLoaded = false;
    }

    init(db, app) {
        this.db = db;
        this.app = app;
        
        // First, check for a logged-in user in the session
        this.checkSession();
    }

    updateTaskProgress(id, progress) {
        if (!this.activeProjectId || !id) return;
        this.db.ref(`projects/${this.activeProjectId}/tasks/${id}/progress`).set(Number(progress));
    }

    requestTaskCompletion(id, isPending) {
        if (!this.activeProjectId || !id) return;
        const updates = {
            pendingCompletion: isPending,
            progress: 100
        };
        this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).update(updates);
    }
    acknowledgeTask(id) {
        if (!this.activeProjectId || !id) return;
        this.db.ref(`projects/${this.activeProjectId}/tasks/${id}/acknowledged`).set(true);
    }
    
    // --- AUTHENTICATION AND SESSION ---

    // PINPOINT: In js/store.js, inside the Store class, REPLACE the checkSession method.

    checkSession() {
        const userId = sessionStorage.getItem('projectflow_userId');
        if (userId) {
            this.db.ref(`/users/${userId}`).once('value', (snapshot) => {
                this.currentUser = snapshot.val();
                if (this.currentUser) {
                    const userStatusRef = this.db.ref(`/presence/${this.currentUser.id}`);
                    userStatusRef.set({ name: this.currentUser.name, role: this.currentUser.role });
                    userStatusRef.onDisconnect().remove();
                    
                    // The line that showed the app too early has been removed from here.
                    this.initFirebaseListeners();
                } else {
                    this.logout();
                }
            });
        } else {
            this.app.showLogin();
        }
    }

    login(email, password) {
        this.db.ref('/users').orderByChild('email').equalTo(email).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const userId = Object.keys(snapshot.val())[0];
                const user = snapshot.val()[userId];

                if (user.password === password) { 
                    this.currentUser = user;
                    sessionStorage.setItem('projectflow_userId', user.id);

                    const userStatusRef = this.db.ref(`/presence/${user.id}`);
                    userStatusRef.set({ name: user.name, role: user.role });
                    userStatusRef.onDisconnect().remove();

                    this.app.showMainApp();
                    this.initFirebaseListeners();
                } else {
                    alert('Incorrect password.');
                }
            } else {
                alert('User with that email does not exist.');
            }
        });
    }

    register(name, email, password) {
        this.db.ref('/users').orderByChild('email').equalTo(email).once('value', (snapshot) => {
            if (snapshot.exists()) {
                alert('A user with this email already exists.');
            } else {
                const newUserId = `user_${Date.now()}`;
                const newUser = new User(newUserId, name, email, password, 'member'); // Default role is member
                this.db.ref(`/users/${newUserId}`).set(newUser).then(() => {
                    alert('Registration successful! Please log in.');
                    this.app.showLogin(true); // Switch to login form
                });
            }
        });
    }
    
    logout() {
        if (this.currentUser) {
            this.db.ref(`/presence/${this.currentUser.id}`).remove();
        }
        sessionStorage.removeItem('projectflow_userId');
        this.currentUser = null;
        window.location.reload();
    }

    // PINPOINT: store.js -> Store class (add this new method)
    changePassword(newPassword) {
        if (!this.currentUser) return;
        
        const userId = this.currentUser.id;
        this.db.ref(`/users/${userId}/password`).set(newPassword)
            .then(() => {
                alert('Password updated successfully!');
            })
            .catch(error => {
                alert('An error occurred. Could not update password.');
                console.error("Password update error:", error);
            });
    }

    updateProject(id, data) {
        // 'data' will be an object like { name: "New Project Name" }
        this.db.ref(`projects/${id}`).update(data);
    }
    initFirebaseListeners() {
        this.db.ref('/presence').on('value', (snapshot) => {
            this.onlineUsers = snapshot.val() ? Object.values(snapshot.val()) : [];
            if (this.dataLoaded) { this.app.render(); }
        });

        this.db.ref('/').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            this.users = data.users ? Object.values(data.users) : [];
            if (data.projects) {
                this.projects = Object.values(data.projects).map(pData => {
                    const project = new Project(pData.id, pData.name);
                    project.team = pData.team || {};
                    if (pData.tasks) {
                        project.tasks = Object.values(pData.tasks).map(tData => new Task(tData.id, tData.name, tData.description, tData.assignedTo, tData.startDate, tData.endDate, tData.category, tData.priority, tData.completed || false, tData.acknowledged || false, tData.progress || 0, tData.pendingCompletion || false));
                    } else { project.tasks = []; }
                    
                    project.milestones = pData.milestones ? Object.values(pData.milestones) : [];
                    project.ganttPhases = pData.ganttPhases ? Object.values(pData.ganttPhases) : [];
                    project.risks = pData.risks ? Object.values(pData.risks) : [];

                    project.rawStatusData = pData.statusItems || {};
                    project.statusItems = pData.statusItems 
                        ? Object.values(pData.statusItems).sort((a, b) => (a.order || 0) - (b.order || 0))
                        : [];

                    return project;
                });
                this.activeProjectId = sessionStorage.getItem('projectflow_activeProjectId') || null;
            } else {
                this.projects = [];
                this.activeProjectId = null;
            }

            const visibleProjects = this.getVisibleProjects();
            const activeProjectIsVisible = this.activeProjectId && visibleProjects.some(p => p.id === this.activeProjectId);

            if (!activeProjectIsVisible && visibleProjects.length > 0) {
                this.setActiveProject(visibleProjects[0].id);
                return; 
            } else if (visibleProjects.length === 0 && this.currentUser.role !== 'member') {
                this.addProject("My First Project");
                return; 
            }

            if (!this.dataLoaded) {
                this.dataLoaded = true;
                this.app.showMainApp(); // <-- THE FIX: Show the app now that it's ready.
                this.app.initMainApp();
            } else {
                this.app.render();
            }
        });
    }

    extendTaskDeadline(id) {
        if (!this.activeProjectId || !id) return;
        const task = this.getTask(id);
        if (!task) return;

        const currentDueDate = task.endDate ? new Date(task.endDate) : new Date();
        currentDueDate.setMinutes(currentDueDate.getMinutes() + currentDueDate.getTimezoneOffset()); // Adjust for timezone
        currentDueDate.setDate(currentDueDate.getDate() + 7);

        const newEndDate = currentDueDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        this.db.ref(`projects/${this.activeProjectId}/tasks/${id}/endDate`).set(newEndDate);
    }
    deleteMultipleTasks(taskIds) {
        if (!this.activeProjectId || taskIds.size === 0) return;
        
        const updates = {};
        taskIds.forEach(id => {
            updates[`/projects/${this.activeProjectId}/tasks/${id}`] = null;
        });

        this.db.ref().update(updates)
            .then(() => {
                // After successful deletion, clear the selection in the app
                this.app.selectedTaskIds.clear();
                this.app.render(); // Re-render to update the UI
            })
            .catch(error => {
                console.error("Batch delete failed: ", error);
                alert("Could not delete all selected tasks. Please try again.");
            });
    }

    updateStatusOrder(orderedIds) {
        if (!this.activeProjectId) return;
        const project = this.getActiveProject();
        if (!project) return;
    
        const updates = {};
        orderedIds.forEach((id, index) => {
            // Find the original key for the status item to update its order property
            const originalKey = Object.keys(project.rawStatusData || {}).find(key => project.rawStatusData[key].id === id);
            if (originalKey) {
                updates[`/projects/${this.activeProjectId}/statusItems/${originalKey}/order`] = index;
            }
        });
    
        this.db.ref().update(updates);
    }

    // --- USER MANAGEMENT (ADMIN) ---
    getAllUsers() {
        return this.users;
    }
    addUser(data) {
        const id = `user_${Date.now()}`;
        const newUser = new User(id, data.name, data.email, data.password, data.role);
        this.db.ref(`/users/${id}`).set(newUser);
    }
    updateUser(id, data) {
        this.db.ref(`/users/${id}`).update(data);
    }
    deleteUser(id) {
        // Here you would also want to remove the user from all project teams
        this.db.ref(`/users/${id}`).remove();
    }

    // --- DATA GETTERS WITH ROLE-BASED FILTERING ---
    getVisibleProjects() {
        if (!this.currentUser) return [];
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'leader') {
            return this.projects;
        }
        // For members, only return projects they are part of
        return this.projects.filter(p => p.team && p.team[this.currentUser.id]);
    }

    getActiveProject() {
        const visibleProjects = this.getVisibleProjects();
        if (!this.activeProjectId || !visibleProjects.some(p => p.id === this.activeProjectId)) return null;
        return this.projects.find(p => p.id === this.activeProjectId);
    }
    
        // PINPOINT: store.js -> Store class -> getProjectTeamMembers method
        getProjectTeamMembers() {
        const project = this.getActiveProject();
        if (!project || !project.team) return [];
        
        return Object.values(project.team)
            .map(profile => {
                const user = this.users.find(u => u.id === profile.userId);
                // If the user was deleted but still exists in the project, 'user' will be undefined.
                if (!user) {
                    return null; // Mark this profile for removal
                }
                return {
                    ...user,
                    profileRole: profile.profileRole,
                    avatar: profile.avatar
                };
            })
            .filter(Boolean); // This is a clever trick to remove all null/undefined items from the array.
    }

    // PINPOINT: store.js -> Store class -> addMemberToProject method
    addMemberToProject(userId, profileRole, avatar) {
        const profileData = {
            userId: userId,
            profileRole: profileRole,
            avatar: avatar || ''
        };
        // Use the userId as the key for the profile in the team object
        this.db.ref(`projects/${this.activeProjectId}/team/${userId}`).set(profileData);
    }

    // PINPOINT: store.js -> Store class -> removeMemberFromProject method
    removeMemberFromProject(userId) {
        this.db.ref(`projects/${this.activeProjectId}/team/${userId}`).remove();
    }
    
    // PINPOINT: store.js -> Store class -> getMember method
    getMember(id) {
        // This now correctly gets the full merged profile (user data + project profile)
        return this.getProjectTeamMembers().find(m => m.id === id);
    }

    // --- PROJECT & ITEM CRUD ---
    setActiveProject(id) {
        this.activeProjectId = id;
        sessionStorage.setItem('projectflow_activeProjectId', id);
        this.app.render(); // Manually trigger a re-render
    }

    addProject(name) {
        const newProjectRef = this.db.ref('projects').push();
        const projectData = { id: newProjectRef.key, name: name };
        newProjectRef.set(projectData);
        this.setActiveProject(newProjectRef.key);
    }
    deleteProject(id) {
        if (this.projects.length <= 1) {
            alert("You cannot delete the last project.");
            return;
        }
        this.db.ref(`projects/${id}`).remove();
    }

    // --- Other CRUD methods remain largely the same, just ensure they use this.activeProjectId
    addTeamMember(data) { const id = `mem_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/team/${id}`).set(new TeamMember(id, data.name, data.role, data.avatar)); }
    updateTeamMember(id, data) { this.db.ref(`projects/${this.activeProjectId}/team/${id}`).update(data); }
    deleteTeamMember(id) { this.db.ref(`projects/${this.activeProjectId}/team/${id}`).remove(); }
    addTask(data) { 
        const id = `task_${Date.now()}`; 
        const newTask = new Task(id, data.name, data.description, data.assignedTo, data.startDate, data.endDate, data.category, data.priority, false, false, 0, false);
        this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).set(newTask); 
    }
    updateTask(id, data) { this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).update(data); }
    toggleTaskCompletion(id) { 
        const task = this.getTask(id);
        if (task) { 
            const updates = {
                completed: true,
                pendingCompletion: false
            };
            this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).update(updates);
        } 
    }
    deleteTask(id) { this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).remove(); }
    getTask(id) { return this.getActiveProject()?.tasks.find(t => t.id === id); }
    addMilestone(d) { const id = `mile_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/milestones/${id}`).set(new Milestone(id, d.name, d.startDate, d.endDate)); }
    updateMilestone(id, d) { this.db.ref(`projects/${this.activeProjectId}/milestones/${id}`).update(d); }
    deleteMilestone(id) { this.db.ref(`projects/${this.activeProjectId}/milestones/${id}`).remove(); }
    getMilestone(id) { return this.getActiveProject()?.milestones.find(m => m.id === id); }
    addStatusItem(d) { const id = `status_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/statusItems/${id}`).set(new StatusItem(id, d.name, d.progress, d.color)); }
    updateStatusItem(id, d) { this.db.ref(`projects/${this.activeProjectId}/statusItems/${id}`).update(d); }
    deleteStatusItem(id) { this.db.ref(`projects/${this.activeProjectId}/statusItems/${id}`).remove(); }
    getStatusItem(id) { return this.getActiveProject()?.statusItems.find(s => s.id === id); }
    addGanttPhase(d) { const id = `gantt_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/ganttPhases/${id}`).set(new GanttPhase(id, d.name, d.startDate, d.endDate, d.color)); }
    updateGanttPhase(id, d) { this.db.ref(`projects/${this.activeProjectId}/ganttPhases/${id}`).update(d); }
    deleteGanttPhase(id) { this.db.ref(`projects/${this.activeProjectId}/ganttPhases/${id}`).remove(); }
    getGanttPhase(id) { return this.getActiveProject()?.ganttPhases.find(p => p.id === id); }
    addRisk(d) { const id = `risk_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/risks/${id}`).set(new Risk(id, d.description, d.impact, d.priority)); }
    updateRisk(id, d) { this.db.ref(`projects/${this.activeProjectId}/risks/${id}`).update(d); }
    deleteRisk(id) { this.db.ref(`projects/${this.activeProjectId}/risks/${id}`).remove(); }
    getRisk(id) { return this.getActiveProject()?.risks.find(r => r.id === id); }
    restoreTask(id) {
        if (!this.activeProjectId || !id) return;
        const updates = {
            completed: false,
            pendingCompletion: false,
            progress: 0
        };
        this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).update(updates);
    }
}



export const store = new Store();