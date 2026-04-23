/**
 * AI Transition Sequences Library UI
 * Phase 2: Creator Workflows - Three-column layout
 */

import type { TransitionLibrary, Transition, TransitionSection } from './transitionTypes.js';
import { createExampleLibrary, getFavoriteTransitions } from './transitionData.js';
import type { TransitionPlayer } from './transitionPlayer.js';

/**
 * Transition Library UI Component
 * Manages the three-column layout for transition management
 */
export class TransitionLibraryUI {
  private container: HTMLElement;
  private library: TransitionLibrary;
  private selectedTransition: Transition | null = null;
  private selectedSection: string | null = null;
  private player: TransitionPlayer;
  private searchQuery = '';
  private activeTags: Set<string> = new Set();
  private sortBy: 'name' | 'duration' | 'usage' | 'recent' = 'name';
  private draggedTransition: Transition | null = null;
  private draggedSection: string | null = null;

  constructor(containerId: string, player: TransitionPlayer) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = element;
    this.library = createExampleLibrary();
    this.selectedSection = this.library.settings.defaultSection;
    this.player = player;
  }

  /**
   * Initialize and render the transition library UI
   */
  public render(): void {
    this.container.innerHTML = this.createLayout();
    this.attachEventListeners();
  }

  /**
   * Create three-column layout HTML
   */
  private createLayout(): string {
    return `
      <div class="transition-library">
        <!-- Left Sidebar (240px) -->
        <aside class="library-sidebar">
          ${this.renderSidebar()}
        </aside>

        <!-- Main Content (flexible) -->
        <main class="library-main">
          ${this.renderMainContent()}
        </main>

        <!-- Right Panel (320px, collapsible) -->
        <aside class="library-details ${this.selectedTransition ? 'open' : ''}">
          ${this.renderDetails()}
        </aside>
      </div>
    `;
  }

  /**
   * Render left sidebar with section navigation
   */
  private renderSidebar(): string {
    const favorites = getFavoriteTransitions(this.library);
    const visibleSections = this.library.sections.filter((s) => !s.hidden);
    const hiddenSections = this.library.sections.filter((s) => s.hidden);

    return `
      <div class="sidebar-header">
        <h2>Transition Library</h2>
        <input
          type="text"
          class="search-input"
          placeholder="🔍 Search all transitions..."
          id="global-search"
        />
        <button class="btn-import" title="Bulk Import Transitions">
          📥 Import Videos
        </button>
      </div>

      <div class="sidebar-content">
        <!-- Favorites -->
        <div class="section-group">
          <button
            class="section-button ${this.selectedSection === 'favorites' ? 'active' : ''}"
            data-section="favorites"
          >
            <span class="section-icon">⭐</span>
            <span class="section-name">Favorites</span>
            <span class="section-count">(${favorites.length})</span>
          </button>
        </div>

        <!-- Sections -->
        <div class="section-group">
          <h3 class="group-header">
            SECTIONS
            <button class="btn-add-section" title="Add Custom Section">➕</button>
          </h3>
          ${visibleSections.map((section) => this.renderSectionButton(section)).join('')}
        </div>

        <!-- Hidden Sections -->
        ${
          hiddenSections.length > 0
            ? `
          <div class="section-group">
            <h3 class="group-header">HIDDEN SECTIONS</h3>
            ${hiddenSections.map((section) => this.renderSectionButton(section, true)).join('')}
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Render individual section button
   */
  private renderSectionButton(section: TransitionSection, isHidden = false): string {
    const isActive = this.selectedSection === section.id;
    return `
      <button
        class="section-button ${isActive ? 'active' : ''} ${isHidden ? 'hidden-section' : ''}"
        data-section="${section.id}"
        style="border-left-color: ${section.color}"
      >
        <span class="section-icon">${section.emoji}</span>
        <span class="section-name">${section.name}</span>
        <span class="section-count">(${section.transitions.length})</span>
        <span class="section-actions">
          <button
            class="btn-icon btn-toggle-visibility"
            data-section-id="${section.id}"
            title="${isHidden ? 'Show section' : 'Hide section'}"
          >
            ${isHidden ? '👁️‍🗨️' : '👁️'}
          </button>
          ${section.custom ? `<button class="btn-icon btn-delete-section" data-section-id="${section.id}" title="Delete section">🗑️</button>` : ''}
          <button class="btn-icon btn-expand" data-section-id="${section.id}">▼</button>
        </span>
      </button>
    `;
  }

  /**
   * Render main content area with grid/list view
   */
  private renderMainContent(): string {
    let transitions: Transition[] = [];
    let title = '';

    if (this.selectedSection === 'favorites') {
      transitions = getFavoriteTransitions(this.library);
      title = '⭐ Favorites';
    } else if (this.selectedSection) {
      const section = this.library.sections.find((s) => s.id === this.selectedSection);
      if (section) {
        transitions = section.transitions;
        title = `${section.emoji} ${section.name}`;
      }
    }

    // Apply filtering and sorting
    transitions = this.filterAndSortTransitions(transitions);

    const viewMode = this.library.settings.viewMode;

    return `
      <div class="main-header">
        <h2>${title} <span class="count">(${transitions.length} transitions)</span></h2>
        <div class="main-toolbar">
          <select class="sort-select" id="sort-select">
            <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Sort: A-Z</option>
            <option value="duration" ${this.sortBy === 'duration' ? 'selected' : ''}>Sort: Duration</option>
            <option value="usage" ${this.sortBy === 'usage' ? 'selected' : ''}>Sort: Most Used</option>
            <option value="recent" ${this.sortBy === 'recent' ? 'selected' : ''}>Sort: Recently Used</option>
          </select>
          <div class="view-toggle">
            <button
              class="btn-view ${viewMode === 'grid' ? 'active' : ''}"
              data-view="grid"
              title="Grid view"
            >⊞</button>
            <button
              class="btn-view ${viewMode === 'list' ? 'active' : ''}"
              data-view="list"
              title="List view"
            >☰</button>
          </div>
          <button class="btn-add-transition">+ Add</button>
        </div>
      </div>

      <div class="main-content">
        ${viewMode === 'grid' ? this.renderGridView(transitions) : this.renderListView(transitions)}
      </div>
    `;
  }

  /**
   * Render grid view of transitions
   */
  private renderGridView(transitions: Transition[]): string {
    return `
      <div class="transition-grid" style="grid-template-columns: repeat(${this.library.settings.gridColumns}, 1fr)">
        ${transitions.map((t) => this.renderGridCard(t)).join('')}
        <div class="grid-card add-card">
          <button class="btn-add-new">
            <span>+</span>
            <span>Add New</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render individual grid card
   */
  private renderGridCard(transition: Transition): string {
    return `
      <div
        class="grid-card ${this.selectedTransition?.id === transition.id ? 'selected' : ''}"
        data-transition-id="${transition.id}"
        draggable="true"
        style="border-left-color: ${transition.color}"
      >
        <div class="card-thumbnail">
          <div class="thumbnail-placeholder" style="background: linear-gradient(135deg, ${transition.color}40, ${transition.color}80)">
            <span class="emoji-large">${transition.emoji}</span>
          </div>
          <div class="card-overlay">
            <button class="btn-play" title="Preview">▶️</button>
          </div>
        </div>
        <div class="card-info">
          <div class="card-title">
            <span class="card-emoji">${transition.emoji}</span>
            <span class="card-name" title="${transition.name}">${transition.name}</span>
          </div>
          <div class="card-meta">
            <span class="card-duration">${transition.duration.toFixed(1)}s</span>
            <button class="btn-favorite ${transition.favorite ? 'active' : ''}" data-transition-id="${transition.id}">
              ${transition.favorite ? '⭐' : '☆'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render list view of transitions
   */
  private renderListView(transitions: Transition[]): string {
    return `
      <div class="transition-list">
        <div class="list-header">
          <div class="col-checkbox"></div>
          <div class="col-name">Name</div>
          <div class="col-duration">Duration</div>
          <div class="col-last-used">Last Used</div>
          <div class="col-actions">Actions</div>
        </div>
        ${transitions.map((t) => this.renderListRow(t)).join('')}
      </div>
    `;
  }

  /**
   * Render individual list row
   */
  private renderListRow(transition: Transition): string {
    const lastUsed = transition.lastUsed ? this.formatRelativeTime(transition.lastUsed) : 'Never';

    return `
      <div
        class="list-row ${this.selectedTransition?.id === transition.id ? 'selected' : ''}"
        data-transition-id="${transition.id}"
        draggable="true"
        style="border-left-color: ${transition.color}"
      >
        <div class="col-checkbox">
          <input type="checkbox" data-transition-id="${transition.id}" />
        </div>
        <div class="col-name">
          <span class="row-emoji">${transition.emoji}</span>
          <span class="row-title">${transition.name}</span>
        </div>
        <div class="col-duration">${transition.duration.toFixed(1)}s</div>
        <div class="col-last-used">${lastUsed}</div>
        <div class="col-actions">
          <button class="btn-favorite ${transition.favorite ? 'active' : ''}" data-transition-id="${transition.id}">
            ${transition.favorite ? '⭐' : '☆'}
          </button>
          <button class="btn-play" title="Preview">▶️</button>
          <button class="btn-edit" title="Edit">✏️</button>
        </div>
      </div>
    `;
  }

  /**
   * Render right panel with transition details
   */
  private renderDetails(): string {
    if (!this.selectedTransition) {
      return `
        <div class="details-empty">
          <p>Select a transition to view details</p>
        </div>
      `;
    }

    const t = this.selectedTransition;
    const lastUsed = t.lastUsed ? this.formatRelativeTime(t.lastUsed) : 'Never';

    return `
      <div class="details-header">
        <h3>${t.name}</h3>
        <button class="btn-close-details">✕</button>
      </div>

      <div class="details-content">
        <div class="detail-preview">
          <div class="preview-placeholder" style="background: linear-gradient(135deg, ${t.color}40, ${t.color}80)">
            <span class="emoji-large">${t.emoji}</span>
          </div>
          <button class="btn-play-large">▶️ Play</button>
        </div>

        <div class="detail-section">
          <label>Name</label>
          <input type="text" value="${t.name}" class="input-detail" data-field="name" />
        </div>

        <div class="detail-row">
          <div class="detail-section">
            <label>Duration</label>
            <input type="text" value="${t.duration.toFixed(1)}s" readonly class="input-detail" />
          </div>
          <div class="detail-section">
            <label>File</label>
            <input type="text" value="${t.video.split('/').pop()}" readonly class="input-detail" />
          </div>
        </div>

        <div class="detail-section">
          <label>Description</label>
          <textarea class="textarea-detail" data-field="description">${t.description || ''}</textarea>
        </div>

        <div class="detail-section">
          <label>Tags</label>
          <div class="tag-list">
            ${t.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
            <button class="btn-add-tag">+</button>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-section">
            <label>Color</label>
            <input type="color" value="${t.color}" class="input-color" data-field="color" />
          </div>
          <div class="detail-section">
            <label>Emoji</label>
            <input type="text" value="${t.emoji}" class="input-emoji" data-field="emoji" maxlength="2" />
          </div>
        </div>

        <div class="detail-section">
          <label>Collections</label>
          <div class="checkbox-group">
            ${this.library.collections
              .map(
                (col) => `
              <label class="checkbox-label">
                <input type="checkbox" ${t.collections.includes(col) ? 'checked' : ''} value="${col}" data-field="collections" />
                <span>${col}</span>
              </label>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="detail-section">
          <label>Settings</label>
          <label class="checkbox-label">
            <input type="checkbox" ${t.returnToPrevious ? 'checked' : ''} data-field="returnToPrevious" />
            <span>Return to previous scene</span>
          </label>
          ${
            !t.returnToPrevious
              ? `
            <div class="indent">
              <label>Go to scene:</label>
              <input type="text" value="${t.nextScene || ''}" class="input-detail" data-field="nextScene" placeholder="SCN_LIVE" />
            </div>
          `
              : ''
          }
          <label class="checkbox-label">
            <input type="checkbox" ${t.favorite ? 'checked' : ''} data-field="favorite" />
            <span>Add to favorites</span>
          </label>
        </div>

        <div class="detail-section">
          <label>Usage</label>
          <p class="detail-text">${t.usageCount || 0} times</p>
          <p class="detail-text">Last used: ${lastUsed}</p>
        </div>

        <div class="detail-actions">
          <button class="btn-delete">Delete</button>
          <button class="btn-duplicate">Duplicate</button>
          <button class="btn-export">Export</button>
        </div>
      </div>
    `;
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  private formatRelativeTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  /**
   * Attach event listeners to interactive elements
   */
  private attachEventListeners(): void {
    // Section navigation
    this.container.querySelectorAll('[data-section]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const section = (e.currentTarget as HTMLElement).dataset.section;
        if (section) {
          this.selectSection(section);
        }
      });
    });

    // Transition cards/rows
    this.container.querySelectorAll('[data-transition-id]').forEach((card) => {
      if (card.classList.contains('grid-card') || card.classList.contains('list-row')) {
        card.addEventListener('click', (e) => {
          // Ignore if clicking on action buttons
          if ((e.target as HTMLElement).closest('.btn-favorite, .btn-play, .btn-edit')) {
            return;
          }
          const id = (e.currentTarget as HTMLElement).dataset.transitionId;
          if (id) {
            this.selectTransition(id);
          }
        });
      }
    });

    // Favorite toggle
    this.container.querySelectorAll('.btn-favorite').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.transitionId;
        if (id) {
          this.toggleFavorite(id);
        }
      });
    });

    // Play transition buttons
    this.container.querySelectorAll('.btn-play, .btn-play-large').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = (e.target as HTMLElement).closest('[data-transition-id]');
        const id = card?.getAttribute('data-transition-id');
        if (id) {
          this.playTransition(id);
        }
      });
    });

    // View mode toggle
    this.container.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const view = (e.currentTarget as HTMLElement).dataset.view as 'grid' | 'list';
        this.setViewMode(view);
      });
    });

    // Close details panel
    const closeBtn = this.container.querySelector('.btn-close-details');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.selectedTransition = null;
        this.render();
      });
    }

    // Search input
    const searchInput = this.container.querySelector('#global-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = this.searchQuery; // Restore search query after re-render
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.setSearchQuery(query);
      });
    }

    // Sort select
    const sortSelect = this.container.querySelector('#sort-select') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const sortBy = (e.target as HTMLSelectElement).value as
          | 'name'
          | 'duration'
          | 'usage'
          | 'recent';
        this.setSortBy(sortBy);
      });
    }

    // Drag-and-drop for transitions
    this.container
      .querySelectorAll('.grid-card[draggable], .list-row[draggable]')
      .forEach((card) => {
        card.addEventListener('dragstart', (e) => this.handleDragStart(e as DragEvent));
        card.addEventListener('dragover', (e) => this.handleDragOver(e as DragEvent));
        card.addEventListener('drop', (e) => this.handleDrop(e as DragEvent));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e as DragEvent));
      });

    // Drag-and-drop for section buttons (to move transitions between sections)
    this.container.querySelectorAll('.section-btn').forEach((btn) => {
      btn.addEventListener('dragover', (e) => this.handleSectionDragOver(e as DragEvent));
      btn.addEventListener('drop', (e) => this.handleSectionDrop(e as DragEvent));
    });

    // Import modal button
    const importBtn = this.container.querySelector('.btn-import');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportModalUI());
    }
  }

  /**
   * Handle drag start for transition cards
   */
  private handleDragStart(e: DragEvent): void {
    const card = e.currentTarget as HTMLElement;
    const transitionId = card.dataset.transitionId;
    if (!transitionId) return;

    const transition = this.findTransitionById(transitionId);
    if (!transition) return;

    this.draggedTransition = transition;
    this.draggedSection = this.selectedSection;

    // Set drag data
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', transitionId);

    // Add visual feedback
    card.classList.add('dragging');
  }

  /**
   * Handle drag over for transition cards (reordering within section)
   */
  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    const card = e.currentTarget as HTMLElement;
    card.classList.add('drag-over');
  }

  /**
   * Handle drop for transition cards (reordering within section)
   */
  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const targetCard = e.currentTarget as HTMLElement;
    targetCard.classList.remove('drag-over');

    const targetId = targetCard.dataset.transitionId;
    if (!targetId || !this.draggedTransition || !this.draggedSection) return;

    // Find current section
    const section = this.library.sections.find((s) => s.id === this.draggedSection);
    if (!section) return;

    // Find indices
    const draggedIndex = section.transitions.findIndex((t) => t.id === this.draggedTransition!.id);
    const targetIndex = section.transitions.findIndex((t) => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    // Reorder transitions
    const [removed] = section.transitions.splice(draggedIndex, 1);
    section.transitions.splice(targetIndex, 0, removed);

    this.render();
    this.showNotification('Transition reordered', 'success');
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(e: DragEvent): void {
    const card = e.currentTarget as HTMLElement;
    card.classList.remove('dragging');

    // Clean up all drag-over classes
    this.container.querySelectorAll('.drag-over').forEach((el) => {
      el.classList.remove('drag-over');
    });

    this.draggedTransition = null;
    this.draggedSection = null;
  }

  /**
   * Handle drag over for section buttons (moving between sections)
   */
  private handleSectionDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    const btn = e.currentTarget as HTMLElement;
    btn.classList.add('drag-over');
  }

  /**
   * Handle drop for section buttons (moving between sections)
   */
  private handleSectionDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget as HTMLElement;
    btn.classList.remove('drag-over');

    const targetSectionId = btn.dataset.section;
    if (!targetSectionId || !this.draggedTransition || !this.draggedSection) return;

    // Don't move if dropping on same section
    if (targetSectionId === this.draggedSection) return;

    // Find source and target sections
    const sourceSection = this.library.sections.find((s) => s.id === this.draggedSection);
    const targetSection = this.library.sections.find((s) => s.id === targetSectionId);

    if (!sourceSection || !targetSection) return;

    // Remove from source section
    const transitionIndex = sourceSection.transitions.findIndex(
      (t) => t.id === this.draggedTransition!.id,
    );
    if (transitionIndex === -1) return;

    const [removed] = sourceSection.transitions.splice(transitionIndex, 1);

    // Add to target section
    targetSection.transitions.push(removed);

    // Switch to target section
    this.selectedSection = targetSectionId;

    this.render();
    this.showNotification(`Moved "${removed.name}" to ${targetSection.name}`, 'success');
  }

  /**
   * Show import modal UI
   */
  private showImportModalUI(): void {
    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Bulk Import Transitions</h2>
          <button class="btn-close-modal">✕</button>
        </div>
        <div class="modal-body">
          <div class="drop-zone" id="drop-zone">
            <div class="drop-zone-icon">📁</div>
            <p class="drop-zone-title">Drag & Drop Video Files</p>
            <p class="drop-zone-subtitle">or click to browse</p>
            <p class="drop-zone-hint">Accepts .mp4, .mov, .webm</p>
            <input type="file" id="file-input" accept=".mp4,.mov,.webm" multiple hidden />
          </div>
          <div class="import-progress" id="import-progress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
            <p class="progress-text" id="progress-text">Processing 0 of 0 files...</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const dropZone = modal.querySelector('#drop-zone') as HTMLElement;
    const fileInput = modal.querySelector('#file-input') as HTMLInputElement;
    const closeBtn = modal.querySelector('.btn-close-modal') as HTMLElement;
    const backdrop = modal.querySelector('.modal-backdrop') as HTMLElement;

    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files) {
        this.handleFileImport(Array.from(fileInput.files), modal);
      }
    });

    // Drag-and-drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-active');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');

      const files = Array.from(e.dataTransfer?.files || []).filter((file) =>
        file.type.match(/video\/(mp4|quicktime|webm)/),
      );

      if (files.length > 0) {
        this.handleFileImport(files, modal);
      }
    });

    // Close modal
    closeBtn.addEventListener('click', () => modal.remove());
    backdrop.addEventListener('click', () => modal.remove());
  }

  /**
   * Handle file import and processing
   */
  private async handleFileImport(files: File[], modal: HTMLElement): Promise<void> {
    const dropZone = modal.querySelector('#drop-zone') as HTMLElement;
    const progressContainer = modal.querySelector('#import-progress') as HTMLElement;
    const progressFill = modal.querySelector('#progress-fill') as HTMLElement;
    const progressText = modal.querySelector('#progress-text') as HTMLElement;

    dropZone.style.display = 'none';
    progressContainer.style.display = 'block';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressText.textContent = `Processing ${i + 1} of ${files.length} files...`;
      progressFill.style.width = `${((i + 1) / files.length) * 100}%`;

      try {
        const transition = await this.processVideoFile(file);

        // Auto-categorize based on duration
        let targetSectionId = 'topic-changes'; // default
        if (transition.duration < 1) {
          targetSectionId = 'quick-reactions';
        } else if (transition.duration >= 1 && transition.duration < 3) {
          targetSectionId = 'topic-changes';
        } else if (transition.duration >= 3 && transition.duration < 5) {
          targetSectionId = 'brb';
        } else if (transition.duration >= 5 && transition.duration < 10) {
          targetSectionId = 'intros';
        } else {
          targetSectionId = 'outros';
        }

        // Add to section
        const section = this.library.sections.find((s) => s.id === targetSectionId);
        if (section) {
          section.transitions.push(transition);
        }
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
      }
    }

    // Complete
    progressText.textContent = `✓ Imported ${files.length} transitions`;
    progressFill.style.width = '100%';

    setTimeout(() => {
      modal.remove();
      this.render();
      this.showNotification(`Imported ${files.length} transitions`, 'success');
    }, 1500);
  }

  /**
   * Process a video file and extract metadata
   */
  private async processVideoFile(file: File): Promise<Transition> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = async () => {
        const duration = video.duration;

        // Generate thumbnail from midpoint
        video.currentTime = duration / 2;

        video.onseeked = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);

          canvas.toDataURL('image/jpeg', 0.7);

          // Create transition object
          const transition: Transition = {
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name.replace(/\.(mp4|mov|webm)$/, ''),
            description: `Imported from ${file.name}`,
            videoPath: URL.createObjectURL(file),
            duration: duration,
            tags: ['imported'],
            color: '#3B82F6',
            emoji: '🎬',
            favorite: false,
            collections: [],
            usageCount: 0,
            streamDeckPages: [],
            returnToPrevious: true,
          };

          resolve(transition);
        };

        video.onerror = () => reject(new Error('Failed to seek video'));
      };

      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Select a section
   */
  private selectSection(sectionId: string): void {
    this.selectedSection = sectionId;
    this.selectedTransition = null; // Clear selection when switching sections
    this.render();
  }

  /**
   * Select a transition
   */
  private selectTransition(transitionId: string): void {
    const transition = this.library.sections
      .flatMap((s) => s.transitions)
      .find((t) => t.id === transitionId);
    if (transition) {
      this.selectedTransition = transition;
      this.render();
    }
  }

  /**
   * Toggle favorite status
   */
  private toggleFavorite(transitionId: string): void {
    this.library.sections.forEach((section) => {
      section.transitions.forEach((t) => {
        if (t.id === transitionId) {
          t.favorite = !t.favorite;
        }
      });
    });
    this.render();
  }

  /**
   * Set view mode (grid or list)
   */
  private setViewMode(mode: 'grid' | 'list'): void {
    this.library.settings.viewMode = mode;
    this.render();
  }

  /**
   * Filter and sort transitions based on current criteria
   */
  private filterAndSortTransitions(transitions: Transition[]): Transition[] {
    // Apply search filter
    let filtered = transitions;

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Apply tag filter
    if (this.activeTags.size > 0) {
      filtered = filtered.filter((t) => t.tags.some((tag) => this.activeTags.has(tag)));
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (this.sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'duration':
        sorted.sort((a, b) => a.duration - b.duration);
        break;
      case 'usage':
        sorted.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return sorted;
  }

  /**
   * Update search query and re-render
   */
  private setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.render();
  }

  /**
   * Update sort criteria and re-render
   */
  private setSortBy(sortBy: 'name' | 'duration' | 'usage' | 'recent'): void {
    this.sortBy = sortBy;
    this.render();
  }

  /**
   * Play a transition using OBS
   */
  private async playTransition(transitionId: string): Promise<void> {
    if (!this.player.isReady()) {
      this.showNotification('OBS is not connected. Please connect to OBS first.', 'error');
      return;
    }

    const transition = this.findTransitionById(transitionId);
    if (!transition) {
      this.showNotification('Transition not found', 'error');
      return;
    }

    try {
      this.showNotification(`Playing: ${transition.name}`, 'info');
      await this.player.playTransition(transition);

      // Update usage count
      transition.usageCount++;
      transition.lastUsed = new Date();
      this.render();
    } catch (error) {
      const err = error as Error;
      this.showNotification(`Failed to play transition: ${err.message}`, 'error');
      console.error('Transition playback error:', error);
    }
  }

  /**
   * Find a transition by ID across all sections
   */
  private findTransitionById(id: string): Transition | null {
    for (const section of this.library.sections) {
      const transition = section.transitions.find((t) => t.id === id);
      if (transition) {
        return transition;
      }
    }
    return null;
  }

  /**
   * Show a notification toast
   */
  private showNotification(message: string, type: 'info' | 'error' | 'success'): void {
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
