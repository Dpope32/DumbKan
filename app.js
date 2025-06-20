// DOM Elements
const board = document.querySelector('.board');
const columns = document.querySelectorAll('.column');
const columnNames = document.querySelectorAll('.column-name');
const addButtons = document.querySelectorAll('.add-task');
const themeToggle = document.getElementById('theme-toggle');
const toast = document.getElementById('toast');

// State
let boardData = {
    boards: {
        work: {
            name: 'Work',
            columns: {
                todo: { name: 'To Do', tasks: [] },
                doing: { name: 'Doing', tasks: [] },
                done: { name: 'Done', tasks: [] }
            }
        }
    },
    activeBoard: 'work'
};
let currentBoard = 'work';

// Task Modal
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskModalTitle = document.getElementById('task-modal-title');
let currentTaskAction = { type: 'add', column: null, task: null };

// Delete Column Modal
let columnToDelete = null;

// Load tasks from localStorage
function loadTasks() {
    try {
        const savedData = localStorage.getItem('dumbkan-data');
        if (savedData) {
            boardData = JSON.parse(savedData);
            currentBoard = boardData.activeBoard || Object.keys(boardData.boards)[0];
        }
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error loading tasks');
    }
}

// Save tasks to localStorage
function saveTasks() {
    try {
        localStorage.setItem('dumbkan-data', JSON.stringify(boardData));
        showToast('Changes saved');
    } catch (error) {
        console.error('Error saving tasks:', error);
        showToast('Error saving changes');
    }
}

// Column name editing
function setupColumnEditing() {
    document.querySelectorAll('.column-name').forEach(nameEl => {
        nameEl.addEventListener('blur', () => {
            const column = nameEl.closest('.column').dataset.column;
            if (boardData.boards[currentBoard].columns[column]) {
                boardData.boards[currentBoard].columns[column].name = nameEl.textContent;
                saveTasks();
            }
        });

        nameEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
        });
    });
}

// Task Modal Functions
function openTaskModal(type, column, task = null) {
    currentTaskAction = { type, column, task };
    taskModalTitle.textContent = type === 'add' ? 'Add Task' : 'Edit Task';
    taskInput.value = task ? task.querySelector('.task-text').textContent : '';
    
    const deleteBtn = document.getElementById('delete-task-btn');
    if (type === 'edit') {
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this task?')) {
                const columnId = task.parentElement.id;
                const index = Array.from(task.parentElement.children).indexOf(task);
                boardData.boards[currentBoard].columns[columnId].tasks.splice(index, 1);
                task.remove();
                saveTasks();
                showToast('Task deleted');
                closeTaskModal();
            }
        };
    } else {
        deleteBtn.style.display = 'none';
    }
    
    taskModal.style.display = 'flex';
    taskInput.focus();
}

function closeTaskModal() {
    taskModal.style.display = 'none';
    taskInput.value = '';
}

// Handle Enter key in task input
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        taskForm.requestSubmit();
    }
});

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    if (currentTaskAction.type === 'add') {
        // Add task to data structure
        if (!boardData.boards[currentBoard].columns[currentTaskAction.column]) {
            return;
        }
        boardData.boards[currentBoard].columns[currentTaskAction.column].tasks.push(text);
        
        // Create and append the task element
        const task = createTask(currentTaskAction.column, text);
        if (task) {
            document.getElementById(currentTaskAction.column).appendChild(task);
        }
    } else {
        // Update existing task
        const task = currentTaskAction.task;
        const columnId = task.closest('.column').dataset.column;
        const tasksContainer = task.parentElement;
        const index = Array.from(tasksContainer.children).indexOf(task);
        
        // Update data structure
        boardData.boards[currentBoard].columns[columnId].tasks[index] = text;
        
        // Update UI
        task.querySelector('.task-text').textContent = text;
    }

    // Save changes
    saveTasks();
    closeTaskModal();
});

// Task Management
function createTask(column, text = '') {
    if (!boardData.boards[currentBoard].columns[column]) {
        console.error('Invalid column:', column);
        return null;
    }

    const task = document.createElement('div');
    task.className = 'task';
    task.draggable = true;
    
    // Create task text
    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    taskText.textContent = text;
    task.appendChild(taskText);

    // Double click to edit
    task.addEventListener('dblclick', () => openTaskModal('edit', column, task));

    // Drag events
    task.addEventListener('dragstart', () => {
        task.classList.add('dragging');
        showToast('Drop in another column to move');
    });
    
    task.addEventListener('dragend', () => {
        task.classList.remove('dragging');
        document.querySelectorAll('.tasks').forEach(col => col.classList.remove('drag-over'));
        updateTasksArray();
        showToast('Task moved');
    });

    return task;
}

// Add task buttons
function setupAddButtons() {
    document.querySelectorAll('.add-task').forEach(button => {
        button.addEventListener('click', () => {
            const column = button.dataset.column;
            openTaskModal('add', column);
        });
    });
}

// Close modal when clicking outside
taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        closeTaskModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && taskModal.style.display === 'flex') {
        closeTaskModal();
    }
});

// Drag and Drop
function setupDragAndDrop() {
    document.querySelectorAll('.tasks').forEach(tasksContainer => {
        tasksContainer.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            if (!dragging) return;

            const notDragging = [...tasksContainer.querySelectorAll('.task:not(.dragging)')];
            const nextTask = notDragging.find(task => {
                const rect = task.getBoundingClientRect();
                return e.clientY < rect.top + rect.height / 2;
            });
            
            if (nextTask) {
                tasksContainer.insertBefore(dragging, nextTask);
            } else {
                tasksContainer.appendChild(dragging);
            }
            
            tasksContainer.classList.add('drag-over');
            document.querySelectorAll('.tasks').forEach(col => {
                if (col !== tasksContainer) col.classList.remove('drag-over');
            });
        });

        tasksContainer.addEventListener('dragleave', () => {
            tasksContainer.classList.remove('drag-over');
        });
    });
}

// Update tasks array after drag and drop
function updateTasksArray() {
    document.querySelectorAll('.column').forEach(column => {
        const columnId = column.dataset.column;
        const tasksContainer = column.querySelector('.tasks');
        if (!tasksContainer) return;

        const tasks = tasksContainer.querySelectorAll('.task');
        
        if (boardData.boards[currentBoard].columns[columnId]) {
            boardData.boards[currentBoard].columns[columnId].tasks = Array.from(tasks)
                .map(task => {
                    const taskText = task.querySelector('.task-text');
                    return taskText ? taskText.textContent.trim() : '';
                })
                .filter(text => text);
        }
    });

    saveTasks();
}

// Delete Column Functions
function openDeleteColumnModal(columnId) {
    columnToDelete = columnId;
    document.getElementById('delete-column-modal').style.display = 'flex';
}

function closeDeleteColumnModal() {
    document.getElementById('delete-column-modal').style.display = 'none';
    columnToDelete = null;
}

function confirmDeleteColumn() {
    if (columnToDelete) {
        // Don't allow deleting all columns
        const columnCount = Object.keys(boardData.boards[currentBoard].columns).length;
        if (columnCount <= 1) {
            showToast('Cannot delete the last column');
            closeDeleteColumnModal();
            return;
        }

        delete boardData.boards[currentBoard].columns[columnToDelete];
        saveTasks();
        renderTasks();
        showToast('Column removed');
        closeDeleteColumnModal();
    }
}

// Close delete column modal when clicking outside
document.getElementById('delete-column-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-column-modal') {
        closeDeleteColumnModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('delete-column-modal').style.display === 'flex') {
        closeDeleteColumnModal();
    }
});

// Add Column functionality
const addColumnBtn = document.getElementById('add-column');

addColumnBtn.addEventListener('click', () => {
    const columnId = 'column-' + Date.now();
    const columnName = 'New Column';

    boardData.boards[currentBoard].columns[columnId] = {
        name: columnName,
        tasks: []
    };

    saveTasks();
    renderTasks();
    showToast('Column added');
});

// Render tasks
function renderTasks() {
    const board = document.querySelector('.board');
    
    // Clear existing columns except add column button
    const addButton = document.getElementById('add-column');
    board.innerHTML = '';
    
    Object.entries(boardData.boards[currentBoard].columns).forEach(([columnId, column]) => {
        const columnEl = document.createElement('div');
        columnEl.className = 'column';
        columnEl.dataset.column = columnId;

        // Create column header container
        const headerDiv = document.createElement('div');
        headerDiv.className = 'column-header';

        // Create column name
        const h2 = document.createElement('h2');
        h2.className = 'column-name';
        h2.contentEditable = true;
        h2.textContent = column.name;

        // Create remove column button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-column';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove column';
        removeBtn.onclick = () => openDeleteColumnModal(columnId);

        // Append header elements
        headerDiv.appendChild(h2);
        headerDiv.appendChild(removeBtn);
        columnEl.appendChild(headerDiv);

        // Create tasks container
        const tasksDiv = document.createElement('div');
        tasksDiv.className = 'tasks';
        tasksDiv.id = columnId;

        // Create add task button
        const addButton = document.createElement('button');
        addButton.className = 'add-task';
        addButton.dataset.column = columnId;
        addButton.textContent = '+ Add Task';

        // Append remaining elements
        columnEl.appendChild(tasksDiv);
        columnEl.appendChild(addButton);

        // Render tasks for this column
        if (column.tasks && Array.isArray(column.tasks)) {
            const uniqueTasks = [...new Set(column.tasks)].filter(task => task && task.trim());
            uniqueTasks.forEach(taskText => {
                const task = createTask(columnId, taskText);
                if (task) {
                    tasksDiv.appendChild(task);
                }
            });
        }

        board.appendChild(columnEl);
    });

    // Re-add the add column button
    board.appendChild(addButton);

    // Re-setup event listeners
    setupColumnEditing();
    setupAddButtons();
    setupDragAndDrop();
}

// Utilities
function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    setTimeout(() => toast.hidden = true, 2000);
}

// Theme handling
function setTheme(isDark, showToastMessage = false) {
    if (isDark) {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '🌙';
        if (showToastMessage) showToast('Dark mode enabled');
    } else {
        document.body.classList.remove('dark-theme');
        themeToggle.innerHTML = '☀️';
        if (showToastMessage) showToast('Light mode enabled');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Initialize theme
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const savedTheme = localStorage.getItem('theme');

if (savedTheme) {
    setTheme(savedTheme === 'dark', false);
} else {
    setTheme(prefersDark.matches, false);
}

// Theme toggle button
themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-theme');
    setTheme(isDark, true);
});

// Listen for system theme changes
prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        setTheme(e.matches, true);
    }
});

// Initialize app
function initializeApp() {
    loadTasks();
    setupColumnEditing();
    setupAddButtons();
    setupDragAndDrop();
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}