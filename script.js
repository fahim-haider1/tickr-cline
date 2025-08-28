// Interactive functionality for Tickr dashboard
document.addEventListener('DOMContentLoaded', function() {
    
    // Handle checkbox interactions
    const checkboxes = document.querySelectorAll('.subtask input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const subtask = this.parentElement;
            const taskCard = subtask.closest('.task-card');
            
            if (this.checked) {
                subtask.classList.add('completed');
                updateProgress(taskCard);
            } else {
                subtask.classList.remove('completed');
                updateProgress(taskCard);
            }
        });
    });
    
    // Update progress bar based on completed subtasks
    function updateProgress(taskCard) {
        const subtasks = taskCard.querySelectorAll('.subtask');
        const completedSubtasks = taskCard.querySelectorAll('.subtask.completed');
        const progress = taskCard.querySelector('.progress');
        
        if (subtasks.length > 0) {
            const progressPercentage = (completedSubtasks.length / subtasks.length) * 100;
            progress.style.width = progressPercentage + '%';
        }
    }
    
    // Add Column button functionality
    const addColumnBtn = document.querySelector('.add-column-btn');
    addColumnBtn.addEventListener('click', function() {
        createNewColumn();
    });
    
    // Add Task button functionality
    const addTaskBtns = document.querySelectorAll('.add-task-btn');
    addTaskBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const column = this.closest('.column');
            createNewTask(column);
        });
    });
    
    // Create new column
    function createNewColumn() {
        const columnsContainer = document.querySelector('.columns-container');
        const columnCount = columnsContainer.children.length + 1;
        
        const newColumn = document.createElement('div');
        newColumn.className = 'column';
        newColumn.innerHTML = `
            <div class="column-header">
                <h3>To do <span class="count">0</span></h3>
                <button class="add-task-btn">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="tasks"></div>
        `;
        
        columnsContainer.appendChild(newColumn);
        
        // Add event listener to new add task button
        const newAddTaskBtn = newColumn.querySelector('.add-task-btn');
        newAddTaskBtn.addEventListener('click', function() {
            const column = this.closest('.column');
            createNewTask(column);
        });
        
        // Animate the new column
        newColumn.style.opacity = '0';
        newColumn.style.transform = 'translateY(20px)';
        setTimeout(() => {
            newColumn.style.opacity = '1';
            newColumn.style.transform = 'translateY(0)';
            newColumn.style.transition = 'all 0.3s ease';
        }, 10);
    }
    
    // Create new task
    function createNewTask(column) {
        const tasksContainer = column.querySelector('.tasks');
        const countSpan = column.querySelector('.count');
        
        const newTask = document.createElement('div');
        newTask.className = 'task-card';
        newTask.innerHTML = `
            <div class="priority-badge high">High</div>
            <h4>New Task</h4>
            <p>Click to edit task description</p>
            <div class="progress-bar">
                <div class="progress" style="width: 0%"></div>
            </div>
            <div class="subtasks">
                <div class="subtask">
                    <input type="checkbox">
                    <span>New subtask</span>
                </div>
            </div>
        `;
        
        tasksContainer.appendChild(newTask);
        
        // Update count
        const currentCount = parseInt(countSpan.textContent);
        countSpan.textContent = currentCount + 1;
        
        // Add event listeners to new checkboxes
        const newCheckboxes = newTask.querySelectorAll('input[type="checkbox"]');
        newCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const subtask = this.parentElement;
                const taskCard = subtask.closest('.task-card');
                
                if (this.checked) {
                    subtask.classList.add('completed');
                    updateProgress(taskCard);
                } else {
                    subtask.classList.remove('completed');
                    updateProgress(taskCard);
                }
            });
        });
        
        // Animate the new task
        newTask.style.opacity = '0';
        newTask.style.transform = 'translateY(20px)';
        setTimeout(() => {
            newTask.style.opacity = '1';
            newTask.style.transform = 'translateY(0)';
            newTask.style.transition = 'all 0.3s ease';
        }, 10);
    }
    
    // Make task titles and descriptions editable
    const taskTitles = document.querySelectorAll('.task-card h4');
    const taskDescriptions = document.querySelectorAll('.task-card p');
    
    taskTitles.forEach(title => {
        title.addEventListener('click', function() {
            makeEditable(this);
        });
    });
    
    taskDescriptions.forEach(description => {
        description.addEventListener('click', function() {
            makeEditable(this);
        });
    });
    
    function makeEditable(element) {
        const originalText = element.textContent;
        const input = document.createElement('input');
        input.value = originalText;
        input.className = 'edit-input';
        
        // Style the input
        input.style.background = 'transparent';
        input.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        input.style.color = 'white';
        input.style.padding = '4px 8px';
        input.style.borderRadius = '4px';
        input.style.width = '100%';
        input.style.fontSize = window.getComputedStyle(element).fontSize;
        input.style.fontWeight = window.getComputedStyle(element).fontWeight;
        
        element.parentNode.replaceChild(input, element);
        input.focus();
        input.select();
        
        function finishEditing() {
            const newText = input.value.trim() || originalText;
            element.textContent = newText;
            input.parentNode.replaceChild(element, input);
        }
        
        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                element.textContent = originalText;
                input.parentNode.replaceChild(element, input);
            }
        });
    }
    
    // Initialize progress bars on page load
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach(taskCard => {
        updateProgress(taskCard);
    });
    
    // Add drag and drop functionality (basic)
    taskCards.forEach(taskCard => {
        taskCard.draggable = true;
        
        taskCard.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', '');
            this.classList.add('dragging');
        });
        
        taskCard.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
        });
    });
    
    // Make columns droppable
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => {
        const tasksContainer = column.querySelector('.tasks');
        
        tasksContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        tasksContainer.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        tasksContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard && this !== draggingCard.parentElement) {
                // Update counts
                const oldColumn = draggingCard.closest('.column');
                const newColumn = this.closest('.column');
                
                const oldCount = parseInt(oldColumn.querySelector('.count').textContent);
                const newCount = parseInt(newColumn.querySelector('.count').textContent);
                
                oldColumn.querySelector('.count').textContent = oldCount - 1;
                newColumn.querySelector('.count').textContent = newCount + 1;
                
                this.appendChild(draggingCard);
            }
        });
    });
});
