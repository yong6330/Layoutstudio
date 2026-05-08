(() => {
    'use strict';

    const APP_VERSION = 'v0.1.0-alpha';
    const SCHEMA_VERSION = 1;
    const THEME_KEY = 'layoutstudio-theme';
    const THEME_MODE_KEY = 'layoutstudio-theme-mode';
    const SESSION_KEY = 'layoutstudio-session-v1';
    const USERS_KEY = 'layoutstudio-local-users-v1';
    const PROJECTS_KEY = 'layoutstudio-projects-v1';
    const LAST_PROJECT_KEY = 'layoutstudio-last-project-v1';
    const COPYRIGHT_TEXT = 'Copyright 2026 ONESTUDIO. All rights reserved.';
    const MM_PER_CM = 10;
    const MM_PER_METER = 1000;

    const CANVAS_LAYERS = {
        grid: 'workspace-grid',
        reference: 'reference-floorplan',
        structure: 'structure',
        furniture: 'furniture',
        helper: 'helper'
    };

    const RUNTIME_LIBRARIES = [
        {
            name: 'Fabric.js',
            purpose: '2D 캔버스 렌더링, 가구 선택/이동, 레이어 구성',
            license: 'MIT',
            summary: '저작권 고지와 라이선스 고지를 유지하면 사용, 수정, 배포가 가능한 허용적 라이선스입니다.'
        },
        {
            name: 'Tesseract.js',
            purpose: '도면 이미지의 치수 후보 OCR 보조 분석',
            license: 'Apache-2.0',
            summary: '고지와 라이선스 조건을 지키면 사용, 수정, 배포가 가능하며 특허 라이선스 조항을 포함합니다.'
        },
        {
            name: 'Lucide',
            purpose: '상단/패널/버튼 아이콘 표시',
            license: 'ISC',
            summary: '저작권 및 허가 고지를 포함하면 사용과 배포가 가능한 짧은 허용적 라이선스입니다.'
        }
    ];

    const CATEGORY_LABELS = {
        desk: '책상',
        chair: '의자',
        storage: '수납장',
        shelf: '선반',
        sofa: '소파',
        bed: '침대',
        table: '테이블',
        other: '기타'
    };

    const CATEGORY_COLORS = {
        desk: '#2563eb',
        chair: '#059669',
        storage: '#7c3aed',
        shelf: '#0891b2',
        sofa: '#ea580c',
        bed: '#be123c',
        table: '#0f766e',
        other: '#64748b'
    };

    const DEFAULT_FURNITURE_PRESETS = [
        { name: '책상', category: 'desk', widthMm: 1200, depthMm: 600, heightMm: 720, color: '#2563eb', memo: '기본 작업 책상' },
        { name: '의자', category: 'chair', widthMm: 450, depthMm: 450, heightMm: 800, color: '#059669', memo: '일반 사무용 의자' },
        { name: '수납장', category: 'storage', widthMm: 1200, depthMm: 450, heightMm: 900, color: '#7c3aed', memo: '낮은 수납장 기준' },
        { name: '침대', category: 'bed', widthMm: 1100, depthMm: 2000, heightMm: 450, color: '#be123c', memo: '싱글 침대 기준' },
        { name: '옷장', category: 'storage', widthMm: 1200, depthMm: 600, heightMm: 2000, color: '#0891b2', memo: '도어 여유 공간은 별도 확인' },
        { name: '테이블', category: 'table', widthMm: 900, depthMm: 600, heightMm: 720, color: '#0f766e', memo: '소형 테이블 기준' }
    ];

    const dom = {};
    const state = {
        canvas: null,
        project: null,
        currentUser: null,
        selectedPlacementId: null,
        selectedStructureId: null,
        mmToPx: 0.1,
        cmToPx: 1,
        inventorySearch: '',
        saveTimer: null,
        saveStatus: 'login-required',
        renderToken: 0,
        renderingWorkspace: false,
        furnitureMode: 'create',
        editingFurnitureId: null,
        pendingFurnitureDraft: null,
        confirmHandlers: [],
        authMode: 'login',
        restoringPan: false,
        wizardCropDrag: null,
        wizard: createEmptyWizard()
    };

    window.LayoutstudioRefreshIcons = refreshIcons;
    document.addEventListener('DOMContentLoaded', boot);

    function boot() {
        captureDom();
        initTheme();
        loadSession();
        bindEvents();
        tickClock();
        window.setInterval(tickClock, 1000);
        window.setInterval(applyAutoThemeIfNeeded, 60000);

        if (window.fabric) {
            initCanvas();
        } else {
            setStartStatus('Fabric.js를 불러오지 못했습니다. 네트워크 연결 후 다시 열어주세요.', 'error');
        }

        const restoredProject = restoreLastProjectFromStorage();
        renderAll();
        if (restoredProject) {
            showStart();
            setCanvasStatus('최근 워크스페이스를 복구했습니다. 목록에서 열기를 눌러 계속 작업하세요.', 'success');
        }
        setSaveStatus(restoredProject || state.currentUser ? 'saved' : 'login-required');
    }

    function captureDom() {
        Object.assign(dom, {
            body: document.body,
            homeButton: $('#homeButton'),
            themeToggle: $('#themeToggle'),
            authButton: $('#authButton'),
            startAuthButton: $('#startAuthButton'),
            systemSettingsButton: $('#systemSettingsButton'),
            saveStatusBadge: $('#saveStatusBadge'),
            navProjectLabel: $('#navProjectLabel'),
            navClockLabel: $('#navClockLabel'),
            startView: $('#startView'),
            studioView: $('#studioView'),
            newProjectButton: $('#newProjectButton'),
            importProjectButton: $('#importProjectButton'),
            refreshProjectsButton: $('#refreshProjectsButton'),
            accountSummaryTitle: $('#accountSummaryTitle'),
            accountSummaryText: $('#accountSummaryText'),
            projectList: $('#projectList'),
            toolbarNewButton: $('#toolbarNewButton'),
            toolbarImportButton: $('#toolbarImportButton'),
            projectSettingsButton: $('#projectSettingsButton'),
            toolbarExportButton: $('#toolbarExportButton'),
            inventoryAddButton: $('#inventoryAddButton'),
            addPresetButton: $('#addPresetButton'),
            inventorySearchInput: $('#inventorySearchInput'),
            projectInput: $('#projectInput'),
            projectTitle: $('#projectTitle'),
            projectSummary: $('#projectSummary'),
            inventoryList: $('#inventoryList'),
            metricRow: $('#metricRow'),
            canvasStatus: $('#canvasStatus'),
            canvasDropzone: $('#canvasDropzone'),
            workspaceCanvas: $('#workspaceCanvas'),
            zoomOutButton: $('#zoomOutButton'),
            fitViewButton: $('#fitViewButton'),
            zoomInButton: $('#zoomInButton'),
            gridToggleButton: $('#gridToggleButton'),
            referenceToggleButton: $('#referenceToggleButton'),
            inspectorPanel: $('#inspectorPanel'),
            floorplanPanel: $('#floorplanPanel'),
            workspaceWizardModal: $('#workspaceWizardModal'),
            closeWizardButton: $('#closeWizardButton'),
            wizardSteps: $('#wizardSteps'),
            wizardBody: $('#wizardBody'),
            wizardBackButton: $('#wizardBackButton'),
            wizardNextButton: $('#wizardNextButton'),
            furnitureModal: $('#furnitureModal'),
            furnitureModalTitle: $('#furnitureModalTitle'),
            closeFurnitureModalButton: $('#closeFurnitureModalButton'),
            cancelFurnitureButton: $('#cancelFurnitureButton'),
            furnitureForm: $('#furnitureForm'),
            furnitureNameInput: $('#furnitureNameInput'),
            furnitureCategoryInput: $('#furnitureCategoryInput'),
            customCategoryField: $('#customCategoryField'),
            furnitureCustomCategoryInput: $('#furnitureCustomCategoryInput'),
            furnitureManufacturerInput: $('#furnitureManufacturerInput'),
            furnitureModelInput: $('#furnitureModelInput'),
            furnitureWidthInput: $('#furnitureWidthInput'),
            furnitureDepthInput: $('#furnitureDepthInput'),
            furnitureHeightInput: $('#furnitureHeightInput'),
            furnitureColorInput: $('#furnitureColorInput'),
            furnitureMemoInput: $('#furnitureMemoInput'),
            saveFurnitureButton: $('#saveFurnitureButton'),
            projectSettingsModal: $('#projectSettingsModal'),
            closeSettingsButton: $('#closeSettingsButton'),
            settingsForm: $('#settingsForm'),
            authModal: $('#authModal'),
            closeAuthButton: $('#closeAuthButton'),
            authBody: $('#authBody'),
            confirmModal: $('#confirmModal'),
            confirmTitle: $('#confirmTitle'),
            confirmMessage: $('#confirmMessage'),
            confirmActions: $('#confirmActions'),
            privacyButton: $('#privacyButton'),
            guideButton: $('#guideButton'),
            licenseButton: $('#licenseButton'),
            creatorButton: $('#creatorInfoButton') || $('#creatorButton')
        });
    }

    function bindEvents() {
        dom.homeButton.addEventListener('click', showStart);
        dom.themeToggle.addEventListener('click', toggleTheme);
        dom.authButton.addEventListener('click', openAuthModal);
        dom.startAuthButton.addEventListener('click', openAuthModal);
        dom.systemSettingsButton.addEventListener('click', openSystemSettings);
        dom.newProjectButton.addEventListener('click', openWorkspaceWizard);
        dom.importProjectButton.addEventListener('click', () => dom.projectInput.click());
        dom.refreshProjectsButton.addEventListener('click', renderStartDashboard);
        dom.toolbarNewButton.addEventListener('click', openWorkspaceWizard);
        dom.toolbarImportButton.addEventListener('click', () => dom.projectInput.click());
        dom.projectSettingsButton.addEventListener('click', openProjectSettings);
        dom.toolbarExportButton.addEventListener('click', exportProjectJson);
        dom.inventoryAddButton.addEventListener('click', () => openFurnitureModal());
        dom.addPresetButton.addEventListener('click', addDefaultPresets);
        dom.inventorySearchInput.addEventListener('input', (event) => {
            state.inventorySearch = event.target.value.trim().toLowerCase();
            renderInventory();
        });
        dom.projectInput.addEventListener('change', handleProjectImport);
        dom.closeWizardButton.addEventListener('click', closeWorkspaceWizard);
        dom.wizardBackButton.addEventListener('click', moveWizardBack);
        dom.wizardNextButton.addEventListener('click', moveWizardNext);
        dom.wizardBody.addEventListener('input', handleWizardInput);
        dom.wizardBody.addEventListener('change', handleWizardChange);
        dom.wizardBody.addEventListener('click', handleWizardClick);
        dom.wizardBody.addEventListener('dragover', handleWizardDragOver);
        dom.wizardBody.addEventListener('dragleave', handleWizardDragLeave);
        dom.wizardBody.addEventListener('drop', handleWizardDrop);
        dom.wizardBody.addEventListener('pointerdown', handleWizardPointerDown);
        window.addEventListener('pointermove', handleWizardPointerMove);
        window.addEventListener('pointerup', handleWizardPointerUp);
        dom.closeFurnitureModalButton.addEventListener('click', closeFurnitureModal);
        dom.cancelFurnitureButton.addEventListener('click', closeFurnitureModal);
        dom.furnitureCategoryInput.addEventListener('change', renderCustomCategoryField);
        dom.furnitureForm.addEventListener('submit', handleFurnitureSubmit);
        dom.closeSettingsButton.addEventListener('click', closeProjectSettings);
        dom.settingsForm.addEventListener('submit', applyProjectSettings);
        dom.settingsForm.addEventListener('input', handleSettingsPreview);
        dom.closeAuthButton.addEventListener('click', closeAuthModal);
        dom.authBody.addEventListener('click', handleAuthClick);
        dom.authBody.addEventListener('submit', handleAuthSubmit);
        dom.inventoryList.addEventListener('dragstart', handleInventoryDragStart);
        dom.inventoryList.addEventListener('click', handleInventoryClick);
        dom.inspectorPanel.addEventListener('input', handleInspectorInput);
        dom.inspectorPanel.addEventListener('change', handleInspectorInput);
        dom.inspectorPanel.addEventListener('click', handleInspectorClick);
        dom.floorplanPanel.addEventListener('input', handleFloorplanPanelInput);
        dom.floorplanPanel.addEventListener('change', handleFloorplanPanelInput);
        dom.floorplanPanel.addEventListener('click', handleFloorplanPanelClick);
        dom.zoomOutButton.addEventListener('click', () => adjustZoom(-0.1));
        dom.zoomInButton.addEventListener('click', () => adjustZoom(0.1));
        dom.fitViewButton.addEventListener('click', fitWorkspaceView);
        dom.gridToggleButton.addEventListener('click', toggleGrid);
        dom.referenceToggleButton.addEventListener('click', toggleReference);
        dom.canvasDropzone.addEventListener('scroll', debounce(captureWorkspacePan, 400));
        dom.privacyButton.addEventListener('click', openPrivacyInfo);
        dom.guideButton.addEventListener('click', openGuideInfo);
        dom.licenseButton.addEventListener('click', openLicenseInfo);
        if (dom.creatorButton) {
            dom.creatorButton.addEventListener('click', openCreatorInfo);
        }

        document.querySelectorAll('[data-panel-tab]').forEach((button) => {
            button.addEventListener('click', () => switchPanelTab(button.dataset.panelTab));
        });

        dom.canvasDropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dom.canvasDropzone.classList.add('drag-over');
        });
        dom.canvasDropzone.addEventListener('dragleave', () => dom.canvasDropzone.classList.remove('drag-over'));
        dom.canvasDropzone.addEventListener('drop', handleCanvasDrop);
        window.addEventListener('resize', debounce(() => {
            if (state.project) renderWorkspace();
        }, 160));
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    function initCanvas() {
        state.canvas = new fabric.Canvas(dom.workspaceCanvas, {
            preserveObjectStacking: true,
            selection: true,
            stopContextMenu: true
        });
        state.canvas.setDimensions({ width: 900, height: 540 });
        state.canvas.on('selection:created', handleCanvasSelection);
        state.canvas.on('selection:updated', handleCanvasSelection);
        state.canvas.on('selection:cleared', () => {
            if (state.renderingWorkspace) return;
            state.selectedPlacementId = null;
            state.selectedStructureId = null;
            renderInspector();
        });
        state.canvas.on('object:moving', (event) => handleCanvasObjectChange(event.target, false));
        state.canvas.on('object:modified', (event) => {
            handleCanvasObjectChange(event.target, true);
            renderProjectPanels();
        });
    }

    function renderAll() {
        renderStartDashboard();
        renderProjectPanels();
        updateNav();
        refreshIcons();
    }

    function renderProjectPanels() {
        renderProjectSummary();
        renderInventory();
        renderInspector();
        renderFloorplanPanel();
        renderWorkspace();
        updateNav();
        refreshIcons();
    }

    function showStart() {
        state.selectedPlacementId = null;
        state.selectedStructureId = null;
        dom.studioView.classList.remove('active');
        dom.startView.classList.add('active');
        renderStartDashboard();
        updateNav();
    }

    function openStudio() {
        dom.startView.classList.remove('active');
        dom.studioView.classList.add('active');
        renderProjectPanels();
    }

    function initTheme() {
        const storedTheme = localStorage.getItem(THEME_KEY);
        const storedMode = localStorage.getItem(THEME_MODE_KEY);
        if (storedTheme && storedMode === 'manual') {
            setTheme(storedTheme, 'manual');
            return;
        }
        setTheme(getAutoTheme(), 'auto');
    }

    function getAutoTheme(date = new Date()) {
        const hour = date.getHours();
        return hour >= 7 && hour < 19 ? 'light' : 'dark';
    }

    function applyAutoThemeIfNeeded() {
        if (localStorage.getItem(THEME_MODE_KEY) === 'manual') return;
        const nextTheme = getAutoTheme();
        if ((nextTheme === 'dark') !== dom.body.classList.contains('dark')) {
            setTheme(nextTheme, 'auto');
        }
    }

    function setTheme(theme, mode = 'manual') {
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        dom.body.classList.toggle('dark', isDark);
        localStorage.setItem(THEME_KEY, theme);
        localStorage.setItem(THEME_MODE_KEY, mode);
        dom.themeToggle.innerHTML = `<i data-lucide="${isDark ? 'moon' : 'sun'}" aria-hidden="true"></i>`;
        refreshIcons();
    }

    function toggleTheme() {
        setTheme(dom.body.classList.contains('dark') ? 'light' : 'dark', 'manual');
    }

    function tickClock() {
        dom.navClockLabel.textContent = new Date().toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function updateNav() {
        const isStudio = dom.studioView.classList.contains('active');
        dom.navProjectLabel.textContent = isStudio && state.project
            ? `${state.project.workspace.name} · ${getFloorplanName(state.project)}`
            : '워크스페이스를 선택하세요';
        dom.toolbarExportButton.disabled = !state.project;
        dom.projectSettingsButton.disabled = !state.project;
        dom.authButton.title = state.currentUser ? `${state.currentUser.email} 계정` : '로그인';
    }

    function renderStartDashboard() {
        if (state.currentUser) {
            dom.accountSummaryTitle.textContent = '로컬 작업 안내';
            dom.accountSummaryText.textContent = `${state.currentUser.email} 로컬 영역에 자동 저장 중입니다. 현재 알파 버전에서는 중요한 작업을 워크스페이스 파일로 백업하세요.`;
            dom.startAuthButton.innerHTML = '<i data-lucide="user" aria-hidden="true"></i><span>계정 관리</span>';
        } else {
            dom.accountSummaryTitle.textContent = '로컬 작업 안내';
            dom.accountSummaryText.textContent = '현재 알파 버전은 브라우저 임시 저장과 워크스페이스 파일 내보내기를 중심으로 동작합니다. 중요한 작업은 파일로 백업하세요.';
            dom.startAuthButton.innerHTML = '<i data-lucide="user" aria-hidden="true"></i><span>계정 관리</span>';
        }

        const projects = readProjectList();
        if (!projects.length) {
            dom.projectList.innerHTML = emptyState('저장된 워크스페이스가 없습니다. 새 워크스페이스를 만들거나 기존 파일을 가져오세요.');
        } else {
            dom.projectList.innerHTML = projects
                .slice()
                .sort((a, b) => String(b.project.updatedAt).localeCompare(String(a.project.updatedAt)))
                .map((project) => `
                    <article class="project-row">
                        <div>
                            <strong>${escapeHtml(project.workspace.name)}</strong>
                            <small>${escapeHtml(getFloorplanName(project))} · ${formatMm(getWorkspaceWidthMm(project.workspace))} x ${formatMm(getWorkspaceHeightMm(project.workspace))} · ${formatDate(project.project.updatedAt)}</small>
                        </div>
                        <div class="project-actions">
                            <button type="button" class="mini-btn" data-open-project-id="${escapeHtml(project.project.id)}">
                                <i data-lucide="folder-open" aria-hidden="true"></i>
                                <span>열기</span>
                            </button>
                            <button type="button" class="mini-btn danger-btn" data-delete-project-id="${escapeHtml(project.project.id)}">
                                <i data-lucide="trash-2" aria-hidden="true"></i>
                                <span>삭제</span>
                            </button>
                        </div>
                    </article>
                `).join('');
        }

        dom.projectList.querySelectorAll('[data-open-project-id]').forEach((button) => {
            button.addEventListener('click', () => {
                const project = readProjectList().find((item) => item.project.id === button.dataset.openProjectId);
                if (!project) return;
                state.project = normalizeProject(project);
                state.selectedPlacementId = null;
                openStudio();
                setCanvasStatus('워크스페이스를 불러왔습니다.', 'success');
                setSaveStatus('saved');
            });
        });
        dom.projectList.querySelectorAll('[data-delete-project-id]').forEach((button) => {
            button.addEventListener('click', () => requestDeleteProject(button.dataset.deleteProjectId));
        });
        refreshIcons();
    }

    function renderProjectSummary() {
        if (!state.project) {
            dom.projectTitle.textContent = '새 워크스페이스';
            dom.projectSummary.textContent = '워크스페이스 선택 전입니다.';
            dom.metricRow.innerHTML = '';
            return;
        }

        const { workspace, furnitureCatalog, placements } = state.project;
        const view = getWorkspaceView(workspace);
        dom.projectTitle.textContent = workspace.name;
        dom.projectSummary.textContent = `${getFloorplanName(state.project)} · ${formatMm(getWorkspaceWidthMm(workspace))} x ${formatMm(getWorkspaceHeightMm(workspace))} · 보관함 ${furnitureCatalog.length}개 · 배치 ${placements.length}개 · 실측 좌표`;
        dom.metricRow.innerHTML = [
            metricChip(formatMm(getWorkspaceWidthMm(workspace)), '실측 가로'),
            metricChip(formatMm(getWorkspaceHeightMm(workspace)), '실측 세로'),
            metricChip(`${Math.round(view.zoom * 100)}%`, '보기 배율'),
            metricChip(`${placements.length}`, '배치')
        ].join('');
        dom.gridToggleButton.classList.toggle('active', workspace.gridVisible);
        dom.referenceToggleButton.classList.toggle('active', workspace.referenceImage.visible);
    }

    function renderInventory() {
        if (!state.project) {
            dom.inventoryList.innerHTML = emptyState('워크스페이스를 먼저 열어주세요.');
            return;
        }

        const query = state.inventorySearch;
        const items = state.project.furnitureCatalog.filter((item) => {
            const text = `${item.name} ${item.categoryLabel} ${item.memo || ''}`.toLowerCase();
            return !query || text.includes(query);
        });

        if (!items.length) {
            dom.inventoryList.innerHTML = emptyState(query ? '검색 조건에 맞는 가구가 없습니다.' : '가구 추가 또는 프리셋 추가로 보관함을 채울 수 있습니다.');
            return;
        }

        dom.inventoryList.innerHTML = items.map((item) => {
            const linkedCount = state.project.placements.filter((placement) => placement.furnitureId === item.id).length;
            const detailTags = [
                item.isPreset ? '프리셋' : '사용자 가구',
                `배치 ${linkedCount}개`,
                [item.manufacturer, item.modelName].filter(Boolean).join(' · '),
                item.memo
            ].filter(Boolean);
            return `
            <article class="inventory-item" draggable="true" data-furniture-id="${escapeHtml(item.id)}">
                <div class="inventory-main">
                        <span class="furniture-swatch" style="background:${escapeHtml(item.color)}"></span>
                        <span class="inventory-name">
                            <strong>${escapeHtml(item.name)}</strong>
                            <small>${escapeHtml(item.categoryLabel)} · ${formatMm(getFurnitureWidthMm(item))} x ${formatMm(getFurnitureDepthMm(item))}${getFurnitureHeightMm(item) ? ` x H ${formatMm(getFurnitureHeightMm(item))}` : ''}</small>
                        </span>
                    </div>
                    <div class="inventory-meta-grid">
                        ${detailTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
                    </div>
                <div class="inventory-actions">
                    <button type="button" class="mini-btn" data-action="place" data-furniture-id="${escapeHtml(item.id)}" title="중앙 배치" aria-label="중앙 배치"><i data-lucide="move-up-right" aria-hidden="true"></i><span>배치</span></button>
                    <button type="button" class="mini-btn" data-action="edit" data-furniture-id="${escapeHtml(item.id)}" title="수정" aria-label="수정"><i data-lucide="pencil" aria-hidden="true"></i><span>수정</span></button>
                    <button type="button" class="mini-btn" data-action="duplicate" data-furniture-id="${escapeHtml(item.id)}" title="복제" aria-label="복제"><i data-lucide="copy" aria-hidden="true"></i><span>복제</span></button>
                    <button type="button" class="mini-btn" data-action="delete" data-furniture-id="${escapeHtml(item.id)}" title="삭제" aria-label="삭제"><i data-lucide="trash-2" aria-hidden="true"></i><span>삭제</span></button>
                </div>
            </article>
        `;
        }).join('');
        refreshIcons();
    }

    function renderWorkspace() {
        if (!state.canvas || !state.project) return;

        const token = ++state.renderToken;
        ensureWorkspaceFloorplans(state.project.workspace);
        const view = calculateWorkspaceView(state.project.workspace);
        state.mmToPx = view.mmToPx;
        state.cmToPx = view.mmToPx * MM_PER_CM;
        const canvasWidth = view.canvasWidth;
        const canvasHeight = view.canvasHeight;

        state.canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
        state.renderingWorkspace = true;
        state.canvas.clear();
        renderGridLayer();
        renderReferenceLayer(token, () => {
            if (token !== state.renderToken) {
                state.renderingWorkspace = false;
                return;
            }
            renderStructureLayer();
            renderFurnitureLayer();
            state.canvas.requestRenderAll();
            restoreWorkspacePan();
            state.renderingWorkspace = false;
        });
    }

    function renderGridLayer() {
        const { workspace } = state.project;
        const widthPx = state.canvas.getWidth();
        const heightPx = state.canvas.getHeight();
        const gridSizeMm = workspace.gridSizeMm || cmToMm(workspace.gridSizeCm || 50);

        if (!workspace.gridVisible) {
            renderWorkspaceBoundary(widthPx, heightPx);
            return;
        }

        const gridColor = document.body.classList.contains('dark') ? 'rgba(226,232,240,0.18)' : 'rgba(15,23,42,0.13)';
        const majorColor = document.body.classList.contains('dark') ? 'rgba(96,165,250,0.32)' : 'rgba(37,99,235,0.25)';
        const maxLines = 240;
        const xLines = Math.min(Math.floor(getWorkspaceWidthMm(workspace) / gridSizeMm), maxLines);
        const yLines = Math.min(Math.floor(getWorkspaceHeightMm(workspace) / gridSizeMm), maxLines);

        for (let i = 0; i <= xLines; i += 1) {
            const x = i * gridSizeMm * state.mmToPx;
            state.canvas.add(new fabric.Line([x, 0, x, heightPx], {
                stroke: i % 2 === 0 ? majorColor : gridColor,
                strokeWidth: i % 2 === 0 ? 1.2 : 0.8,
                selectable: false,
                evented: false,
                excludeFromExport: true,
                data: { layer: CANVAS_LAYERS.grid }
            }));
        }

        for (let i = 0; i <= yLines; i += 1) {
            const y = i * gridSizeMm * state.mmToPx;
            state.canvas.add(new fabric.Line([0, y, widthPx, y], {
                stroke: i % 2 === 0 ? majorColor : gridColor,
                strokeWidth: i % 2 === 0 ? 1.2 : 0.8,
                selectable: false,
                evented: false,
                excludeFromExport: true,
                data: { layer: CANVAS_LAYERS.grid }
            }));
        }
        renderGridLabels(widthPx, heightPx, gridSizeMm);
        renderWorkspaceBoundary(widthPx, heightPx);
    }

    function renderGridLabels(widthPx, heightPx, gridSizeMm) {
        const labelStepMm = gridSizeMm < 1000 ? 1000 : gridSizeMm;
        if (labelStepMm * state.mmToPx < 42) return;
        const labelColor = document.body.classList.contains('dark') ? 'rgba(191,219,254,0.72)' : 'rgba(37,99,235,0.72)';
        const maxLabels = 14;
        let labelCount = 0;

        for (let xMm = labelStepMm; xMm < getWorkspaceWidthMm(state.project.workspace) && labelCount < maxLabels; xMm += labelStepMm) {
            const x = mmToCanvas(xMm);
            state.canvas.add(new fabric.Text(formatGridLabel(xMm), {
                left: x + 4,
                top: 6,
                fontSize: 10,
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 900,
                fill: labelColor,
                selectable: false,
                evented: false,
                excludeFromExport: true,
                data: { layer: CANVAS_LAYERS.grid }
            }));
            labelCount += 1;
        }

        labelCount = 0;
        for (let yMm = labelStepMm; yMm < getWorkspaceHeightMm(state.project.workspace) && labelCount < maxLabels; yMm += labelStepMm) {
            const y = mmToCanvas(yMm);
            state.canvas.add(new fabric.Text(formatGridLabel(yMm), {
                left: 8,
                top: Math.min(heightPx - 18, y + 4),
                fontSize: 10,
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 900,
                fill: labelColor,
                selectable: false,
                evented: false,
                excludeFromExport: true,
                data: { layer: CANVAS_LAYERS.grid }
            }));
            labelCount += 1;
        }

        state.canvas.add(new fabric.Text('실측 그리드', {
            left: Math.max(8, widthPx - 72),
            top: Math.max(8, heightPx - 22),
            fontSize: 10,
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 900,
            fill: labelColor,
            selectable: false,
            evented: false,
            excludeFromExport: true,
            data: { layer: CANVAS_LAYERS.grid }
        }));
    }

    function renderWorkspaceBoundary(widthPx, heightPx) {
        state.canvas.add(new fabric.Rect({
            left: 0,
            top: 0,
            width: widthPx,
            height: heightPx,
            fill: 'rgba(255,255,255,0)',
            stroke: '#365f7d',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            excludeFromExport: true,
            data: { layer: CANVAS_LAYERS.helper }
        }));
    }

    function renderReferenceLayer(token, callback) {
        const floorplan = getActiveFloorplan();
        const reference = floorplan?.referenceImage || state.project.workspace.referenceImage;
        const crop = floorplan?.calibration?.imageCrop || state.project.workspace.calibration.imageCrop;

        if (!reference?.visible || !reference?.dataUrl || !crop?.width || !crop?.height) {
            callback();
            return;
        }

        fabric.Image.fromURL(reference.dataUrl, (image) => {
            if (token !== state.renderToken) {
                state.renderingWorkspace = false;
                return;
            }
            image.set({
                left: 0,
                top: 0,
                originX: 'left',
                originY: 'top',
                cropX: crop.x,
                cropY: crop.y,
                width: crop.width,
                height: crop.height,
                scaleX: state.canvas.getWidth() / crop.width,
                scaleY: state.canvas.getHeight() / crop.height,
                opacity: reference.opacity,
                selectable: false,
                evented: false,
                excludeFromExport: true,
                data: { layer: CANVAS_LAYERS.reference, floorplanId: floorplan?.id || null }
            });
            state.canvas.add(image);
            image.sendToBack();
            callback();
        });
    }

    function renderStructureLayer() {
        const rooms = getStructureRooms();
        rooms.forEach((room) => {
            const object = createStructureRoomObject(room);
            if (!object) return;
            state.canvas.add(object);
            if (room.id === state.selectedStructureId) {
                state.canvas.setActiveObject(object);
            }
        });
    }

    function createStructureRoomObject(room) {
        const widthPx = Math.max(12, mmToCanvas(getRoomWidthMm(room)));
        const heightPx = Math.max(12, mmToCanvas(getRoomHeightMm(room)));
        const rect = new fabric.Rect({
            width: widthPx,
            height: heightPx,
            rx: 4,
            ry: 4,
            originX: 'center',
            originY: 'center',
            fill: document.body.classList.contains('dark') ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.035)',
            stroke: room.id === state.selectedStructureId ? '#365f7d' : 'rgba(100, 116, 139, 0.62)',
            strokeWidth: room.id === state.selectedStructureId ? 2 : 1.3,
            strokeDashArray: [8, 6]
        });
        const label = new fabric.Textbox(room.name || '실내 영역', {
            width: Math.max(36, widthPx - 10),
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 900,
            fontSize: Math.max(9, Math.min(13, Math.min(widthPx, heightPx) / 5)),
            fill: document.body.classList.contains('dark') ? 'rgba(226,232,240,0.78)' : 'rgba(51,65,85,0.82)',
            splitByGrapheme: true
        });
        return new fabric.Group([rect, label], {
            left: mmToCanvas(getRoomXMm(room) + getRoomWidthMm(room) / 2),
            top: mmToCanvas(getRoomYMm(room) + getRoomHeightMm(room) / 2),
            originX: 'center',
            originY: 'center',
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
            hasBorders: true,
            borderColor: '#365f7d',
            borderScaleFactor: 1.4,
            hoverCursor: 'move',
            data: { type: 'room', layer: CANVAS_LAYERS.structure, roomId: room.id }
        });
    }

    function renderFurnitureLayer() {
        const placements = state.project.placements.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        placements.forEach((placement) => {
            const object = createPlacementObject(placement);
            if (!object) return;
            state.canvas.add(object);
            if (placement.id === state.selectedPlacementId) {
                state.canvas.setActiveObject(object);
            }
        });
    }

    function createPlacementObject(placement) {
        const widthMm = getPlacementWidthMm(placement);
        const depthMm = getPlacementDepthMm(placement);
        const widthPx = Math.max(10, mmToCanvas(widthMm));
        const heightPx = Math.max(10, mmToCanvas(depthMm));
        const rect = new fabric.Rect({
            width: widthPx,
            height: heightPx,
            rx: Math.min(8, widthPx / 8, heightPx / 8),
            ry: Math.min(8, widthPx / 8, heightPx / 8),
            originX: 'center',
            originY: 'center',
            fill: hexToRgba(placement.color, placement.locked ? 0.55 : 0.84),
            stroke: isPlacementOutOfBounds(placement) ? '#be123c' : placement.color,
            strokeWidth: isPlacementOutOfBounds(placement) ? 3 : 2
        });
        const parts = [rect];
        const canShowName = widthPx > 46 && heightPx > 26;
        const canShowSize = widthPx > 72 && heightPx > 46;

        if (canShowName) {
            parts.push(new fabric.Textbox(placement.name, {
                width: Math.max(24, widthPx - 12),
                originX: 'center',
                originY: 'center',
                textAlign: 'center',
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 900,
                fontSize: Math.max(9, Math.min(14, Math.min(widthPx, heightPx) / 4)),
                fill: '#ffffff',
                splitByGrapheme: true
            }));
        }
        if (canShowSize) {
            parts.push(new fabric.Textbox(`${formatMm(widthMm)} x ${formatMm(depthMm)}`, {
                width: Math.max(24, widthPx - 14),
                originX: 'center',
                originY: 'center',
                top: Math.min(heightPx / 2 - 14, 18),
                textAlign: 'center',
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 800,
                fontSize: 9,
                fill: 'rgba(255,255,255,0.82)',
                splitByGrapheme: true
            }));
        }

        const group = new fabric.Group(parts, {
            left: mmToCanvas(getPlacementXMm(placement) + widthMm / 2),
            top: mmToCanvas(getPlacementYMm(placement) + depthMm / 2),
            angle: placement.rotationDeg || 0,
            originX: 'center',
            originY: 'center',
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            lockMovementX: Boolean(placement.locked),
            lockMovementY: Boolean(placement.locked),
            hasControls: false,
            hasBorders: true,
            borderColor: '#365f7d',
            borderScaleFactor: 2,
            hoverCursor: placement.locked ? 'not-allowed' : 'move',
            data: { type: 'placement', layer: CANVAS_LAYERS.furniture, placementId: placement.id }
        });

        return group;
    }

    function renderInspector() {
        if (!state.project) {
            dom.inspectorPanel.innerHTML = emptyState('워크스페이스를 먼저 열어주세요.');
            return;
        }

        const room = getSelectedRoom();
        if (room) {
            renderRoomInspector(room);
            return;
        }

        const placement = getSelectedPlacement();
        if (!placement) {
            const view = getWorkspaceView(state.project.workspace);
            dom.inspectorPanel.innerHTML = `
                <div class="inspector-card">
                    <p class="panel-kicker">Overview</p>
                    <h3>${escapeHtml(state.project.workspace.name)}</h3>
                    <div class="overview-grid">
                        <span><strong>도면명</strong>${escapeHtml(getFloorplanName(state.project))}</span>
                        <span><strong>실제 배치 영역</strong>${formatMm(getWorkspaceWidthMm(state.project.workspace))} x ${formatMm(getWorkspaceHeightMm(state.project.workspace))}</span>
                        <span><strong>가구 보관함</strong>${state.project.furnitureCatalog.length}개</span>
                        <span><strong>배치된 가구</strong>${state.project.placements.length}개</span>
                        <span><strong>현재 확대율</strong>${Math.round(view.zoom * 100)}%</span>
                        <span><strong>저장 상태</strong>${getSaveStatusLabel()}</span>
                    </div>
                </div>
            `;
            return;
        }

        const sourceItem = placement.furnitureId ? getFurniture(placement.furnitureId) : null;
        dom.inspectorPanel.innerHTML = `
            <div class="inspector-card">
                <div class="selection-title">
                    <span class="furniture-swatch" style="background:${escapeHtml(placement.color)}"></span>
                    <div>
                        <h3>${escapeHtml(placement.name)}</h3>
                        <p>${escapeHtml(placement.categoryLabel)} · ${formatMm(getPlacementWidthMm(placement))} x ${formatMm(getPlacementDepthMm(placement))}${getPlacementHeightMm(placement) ? ` x H ${formatMm(getPlacementHeightMm(placement))}` : ''}</p>
                    </div>
                </div>
                <div class="info-card compact-card">
                    <p class="status-line">${sourceItem ? `보관함 원본: ${escapeHtml(sourceItem.name)} · 배치 항목은 개별 수정값을 따로 저장합니다.` : '보관함 원본과 연결되지 않은 독립 배치 항목입니다.'}</p>
                </div>
                <div class="inspector-grid">
                    <div class="placement-name-color-row">
                        <label class="form-field">
                            <span>표시 이름</span>
                            <input data-placement-field="name" type="text" value="${escapeHtml(placement.name)}">
                        </label>
                        <label class="placement-color-mini" title="색상">
                            <input data-placement-field="color" type="color" value="${escapeHtml(placement.color)}" aria-label="가구 색상">
                        </label>
                    </div>
                    <label class="form-field">
                        <span>종류</span>
                        <select data-placement-field="category">
                            ${renderCategoryOptions(placement.category)}
                        </select>
                    </label>
                    <label class="form-field">
                        <span>가로 W(mm)</span>
                        <input data-placement-field="widthMm" type="number" min="1" step="1" value="${round(getPlacementWidthMm(placement), 0)}">
                    </label>
                    <label class="form-field">
                        <span>세로 D(mm)</span>
                        <input data-placement-field="depthMm" type="number" min="1" step="1" value="${round(getPlacementDepthMm(placement), 0)}">
                    </label>
                    <label class="form-field">
                        <span>높이 H(mm)</span>
                        <input data-placement-field="heightMm" type="number" min="0" step="1" value="${round(getPlacementHeightMm(placement), 0)}">
                    </label>
                    <label class="form-field">
                        <span>X 실측 좌표(mm)</span>
                        <input data-placement-field="xMm" type="number" step="1" value="${round(getPlacementXMm(placement), 0)}">
                    </label>
                    <label class="form-field">
                        <span>Y 실측 좌표(mm)</span>
                        <input data-placement-field="yMm" type="number" step="1" value="${round(getPlacementYMm(placement), 0)}">
                    </label>
                    <label class="form-field">
                        <span>회전 각도</span>
                        <input data-placement-field="rotationDeg" type="number" min="0" max="360" step="1" value="${round(normalizeAngle(placement.rotationDeg), 1)}">
                    </label>
                    <label class="form-field">
                        <span>0~360도</span>
                        <input data-placement-field="rotationRange" type="range" min="0" max="360" step="1" value="${round(normalizeAngle(placement.rotationDeg), 1)}">
                    </label>

                    <label class="toggle-field">
                        <span>잠금</span>
                        <input data-placement-field="locked" type="checkbox" ${placement.locked ? 'checked' : ''}>
                    </label>
                    <label class="form-field full">
                        <span>메모</span>
                        <textarea data-placement-field="memo">${escapeHtml(placement.memo || '')}</textarea>
                    </label>
                </div>
                <div class="rotation-button-row">
                    <button type="button" class="mini-btn" data-inspector-action="rotate-minus">-15도</button>
                    <button type="button" class="mini-btn" data-inspector-action="rotate-plus">+15도</button>
                    <button type="button" class="mini-btn" data-inspector-action="rotate-90">90도</button>
                    <button type="button" class="mini-btn" data-inspector-action="rotate-zero">0도</button>
                </div>
                <div class="inspector-actions">
                    <button type="button" class="toolbar-btn" data-inspector-action="duplicate"><i data-lucide="copy" aria-hidden="true"></i><span>복제</span></button>
                    ${sourceItem ? '<button type="button" class="toolbar-btn" data-inspector-action="unlink"><i data-lucide="unlink" aria-hidden="true"></i><span>원본 연결 해제</span></button>' : ''}
                    <button type="button" class="toolbar-btn" data-inspector-action="front"><i data-lucide="bring-to-front" aria-hidden="true"></i><span>앞으로</span></button>
                    <button type="button" class="toolbar-btn" data-inspector-action="back"><i data-lucide="send-to-back" aria-hidden="true"></i><span>뒤로</span></button>
                    <button type="button" class="toolbar-btn danger-btn" data-inspector-action="delete"><i data-lucide="trash-2" aria-hidden="true"></i><span>삭제</span></button>
                </div>
            </div>
        `;
        refreshIcons();
    }

    function renderFloorplanPanel() {
        if (!state.project) {
            dom.floorplanPanel.innerHTML = emptyState('워크스페이스를 먼저 열어주세요.');
            return;
        }

        const { workspace, analysis } = state.project;
        const floorplan = getActiveFloorplan();
        const reference = floorplan.referenceImage;
        const crop = floorplan.calibration.imageCrop;
        const cropRatioX = crop.width ? getWorkspaceWidthMm(workspace) / crop.width : 0;
        const cropRatioY = crop.height ? getWorkspaceHeightMm(workspace) / crop.height : 0;
        const rooms = getStructureRooms();
        dom.floorplanPanel.innerHTML = `
            <div class="analysis-block">
                <div class="info-card">
                    <p class="panel-kicker">Reference Floorplan</p>
                    <h3>참조 도면</h3>
                    <p class="status-line">${escapeHtml(floorplan.name)} · 도면 기준 영역 ${Math.round(crop.width)} x ${Math.round(crop.height)}px · 잠긴 참조 레이어</p>
                </div>
                <label class="toggle-field">
                    <span>참조 도면 표시</span>
                    <input data-floorplan-field="referenceVisible" type="checkbox" ${reference.visible ? 'checked' : ''}>
                </label>
                <label class="form-field">
                    <span>참조 도면 투명도</span>
                    <input data-floorplan-field="referenceOpacity" type="range" min="0" max="100" step="1" value="${Math.round(reference.opacity * 100)}">
                </label>
                <div class="info-card">
                    <p class="panel-kicker">Plan Analysis</p>
                    <h3>치수 후보</h3>
                    ${renderDimensionList(analysis.dimensions)}
                </div>
                <div class="info-card">
                    <p class="panel-kicker">Workspace</p>
                    <h3>실제 배치 영역</h3>
                    <p class="status-line">${escapeHtml(workspace.name)} · ${formatMm(getWorkspaceWidthMm(workspace))} x ${formatMm(getWorkspaceHeightMm(workspace))} · ${escapeHtml(workspace.calibration.mode)}</p>
                </div>
                <div class="info-card">
                    <p class="panel-kicker">Calibration</p>
                    <h3>도면 기준 영역 매핑</h3>
                    <p class="status-line">도면 1px은 가로 약 ${round(cropRatioX, 1)}mm, 세로 약 ${round(cropRatioY, 1)}mm로 실제 배치 영역에 맞춰 표시됩니다. 기준 영역을 바꿔도 배치된 가구의 실측 좌표는 유지됩니다.</p>
                </div>
                <div class="info-card">
                    <p class="panel-kicker">Structure Layer</p>
                    <h3>실내 영역 ${rooms.length}개</h3>
                    <p class="status-line">방/영역 사각형은 참조 도면과 별도로 저장됩니다. 도면 위 위치를 움직여 실내 외곽 재구성의 기준으로 사용할 수 있습니다.</p>
                </div>
                <button type="button" class="toolbar-btn active-filter" data-floorplan-action="settings">
                    <i data-lucide="sliders-horizontal" aria-hidden="true"></i>
                    <span>기준 영역 재보정</span>
                </button>
                <button type="button" class="toolbar-btn" data-floorplan-action="add-room">
                    <i data-lucide="square-dashed-mouse-pointer" aria-hidden="true"></i>
                    <span>방/영역 추가</span>
                </button>
            </div>
        `;
        refreshIcons();
    }

    function renderDimensionList(dimensions) {
        if (!dimensions?.length) return emptyState('OCR에서 감지된 치수 후보가 없습니다.');
        return `<div class="dimension-grid">${dimensions.slice(0, 6).map((dimension) => `
            <button type="button" class="dimension-option" data-dimension-mm="${dimension.mm}">
                <strong>${escapeHtml(dimension.raw)}</strong>
                <small>${formatMm(dimension.mm)}</small>
            </button>
        `).join('')}</div>`;
    }

    function openWorkspaceWizard() {
        state.wizard = createEmptyWizard();
        dom.workspaceWizardModal.classList.add('open');
        dom.workspaceWizardModal.setAttribute('aria-hidden', 'false');
        renderWizard();
    }

    function closeWorkspaceWizard() {
        dom.workspaceWizardModal.classList.remove('open');
        dom.workspaceWizardModal.setAttribute('aria-hidden', 'true');
    }

    function createEmptyWizard() {
        return {
            step: 1,
            fileName: '',
            fileType: '',
            dataUrl: '',
            imageSize: null,
            projectName: '',
            workspaceName: '새 워크스페이스',
            floorplanName: '기본 도면',
            includePresets: true,
            analysisStatus: 'waiting',
            rawText: '',
            dimensions: [],
            selectedDimensionMm: null,
            selectedDimensionCm: null,
            widthValue: 6000,
            heightValue: 4400,
            unit: 'mm',
            crop: { x: 0, y: 0, width: 0, height: 0 },
            furnitureDrafts: createWizardPresetDrafts(),
            newFurniture: createEmptyWizardFurnitureDraft(false)
        };
    }

    function renderWizard() {
        const steps = [
            ['1', '도면 업로드'],
            ['2', '분석 확인'],
            ['3', '실제 크기'],
            ['4', '도면 기준 영역'],
            ['5', '가구 보관함']
        ];
        dom.wizardSteps.innerHTML = steps.map(([index, label]) => `
            <div class="wizard-step ${Number(index) === state.wizard.step ? 'active' : ''}">
                <strong>Step ${index}</strong>
                <span>${label}</span>
            </div>
        `).join('');

        dom.wizardBody.innerHTML = getWizardBody();
        dom.wizardBackButton.disabled = state.wizard.step === 1;
        dom.wizardNextButton.textContent = state.wizard.step === 5 ? '워크스페이스 생성' : '다음';
        refreshIcons();
    }

    function getWizardBody() {
        const wizard = state.wizard;
        if (wizard.step === 1) {
            return `
                <div class="wizard-form-grid">
                    <div class="wizard-upload-layout full">
                        <label class="upload-card ${wizard.fileName ? 'has-file' : ''}" for="wizardFloorplanInput">
                            <input id="wizardFloorplanInput" class="visually-hidden-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
                            <span class="option-icon"><i data-lucide="${wizard.fileName ? 'file-check-2' : 'image-plus'}" aria-hidden="true"></i></span>
                            <span>
                                <strong>${wizard.fileName ? escapeHtml(wizard.fileName) : '도면 파일 업로드'}</strong>
                                <small>${wizard.imageSize ? `${wizard.imageSize.width} x ${wizard.imageSize.height}px` : 'PNG, JPG, WEBP 지원'}</small>
                            </span>
                        </label>
                        <div class="wizard-upload-fields">
                            <label class="form-field">
                                <span>워크스페이스명</span>
                                <input data-wizard-field="workspaceName" type="text" value="${escapeHtml(wizard.workspaceName)}">
                            </label>
                            <label class="form-field">
                                <span>도면명</span>
                                <input data-wizard-field="floorplanName" type="text" value="${escapeHtml(wizard.floorplanName)}">
                            </label>
                        </div>
                    </div>
                    <div class="info-card full">
                        <p class="status-line">도면 이미지는 잠긴 참조 레이어로 쓰이고, 실제 배치 좌표는 다음 단계에서 입력하는 실측 크기 기준으로 저장됩니다.</p>
                    </div>
                </div>
            `;
        }

        if (wizard.step === 2) {
            const statusText = {
                waiting: '도면 이미지를 먼저 선택하세요.',
                analyzing: 'OCR로 도면 치수 후보를 찾고 있습니다.',
                detected: '치수 후보를 찾았습니다. 기준 치수는 추천값이며 자동 확정되지 않습니다.',
                empty: '치수 후보를 찾지 못했습니다. 수동 입력으로 계속 진행할 수 있습니다.',
                unavailable: 'OCR 엔진을 사용할 수 없습니다. 수동 입력으로 계속 진행할 수 있습니다.',
                failed: 'OCR 분석 중 오류가 발생했습니다. 수동 입력으로 계속 진행할 수 있습니다.'
            }[wizard.analysisStatus] || '분석 결과를 확인하세요.';

            return `
                <div class="info-card">
                    <p class="panel-kicker">OCR Result</p>
                    <h3>도면 분석 결과 확인</h3>
                    <p class="status-line">${escapeHtml(statusText)}</p>
                </div>
                ${renderWizardDimensionOptions()}
            `;
        }

        if (wizard.step === 3) {
            const widthMm = unitToMm(wizard.widthValue, wizard.unit);
            const heightMm = unitToMm(wizard.heightValue, wizard.unit);
            return `
                <div class="wizard-form-grid">
                    <label class="form-field">
                        <span>단위</span>
                        <select data-wizard-field="unit">
                            <option value="mm" ${wizard.unit === 'mm' ? 'selected' : ''}>mm</option>
                            <option value="cm" ${wizard.unit === 'cm' ? 'selected' : ''}>cm</option>
                            <option value="m" ${wizard.unit === 'm' ? 'selected' : ''}>m</option>
                        </select>
                    </label>
                    <label class="form-field">
                        <span>도면 방향</span>
                        <select data-wizard-action="orientation">
                            <option value="keep">현재 방향 유지</option>
                            <option value="swap">가로/세로 바꾸기</option>
                        </select>
                    </label>
                    <label class="form-field">
                        <span>실제 배치 영역 가로(${escapeHtml(wizard.unit)})</span>
                        <input data-wizard-field="widthValue" type="number" min="0.01" step="0.01" value="${wizard.widthValue}">
                    </label>
                    <label class="form-field">
                        <span>실제 배치 영역 세로(${escapeHtml(wizard.unit)})</span>
                        <input data-wizard-field="heightValue" type="number" min="0.01" step="0.01" value="${wizard.heightValue}">
                    </label>
                    <div class="info-card full">
                        <p class="status-line">생성될 실제 배치 영역: ${formatMm(widthMm)} x ${formatMm(heightMm)}. 참조 도면 픽셀 크기와 독립적인 실측 좌표로 저장됩니다.</p>
                    </div>
                </div>
            `;
        }

        if (wizard.step === 5) {
            return renderWizardFurnitureStep();
        }

        const imageSize = wizard.imageSize || { width: 1, height: 1 };
        const crop = normalizeCrop(wizard.crop, imageSize);
        const edges = cropToEdges(crop, imageSize);
        return `
            <div class="calibration-layout">
                <div class="calibration-preview" style="aspect-ratio:${imageSize.width}/${imageSize.height};">
                    ${wizard.dataUrl ? `<img src="${wizard.dataUrl}" alt="도면 기준 영역 미리보기">` : ''}
                    <span class="crop-box" data-crop-handle="move" style="left:${(crop.x / imageSize.width) * 100}%; top:${(crop.y / imageSize.height) * 100}%; width:${(crop.width / imageSize.width) * 100}%; height:${(crop.height / imageSize.height) * 100}%;">
                        ${['n','e','s','w','nw','ne','se','sw'].map((handle) => `<i data-crop-handle="${handle}" class="crop-handle crop-handle-${handle}" aria-hidden="true"></i>`).join('')}
                    </span>
                    <span class="crop-loupe" aria-hidden="true"></span>
                </div>
                <div class="crop-control-grid">
                    <label class="form-field">
                        <span>좌측 여백(px)</span>
                        <input data-wizard-crop-edge="left" type="number" min="0" max="${imageSize.width}" step="1" value="${Math.round(edges.left)}">
                    </label>
                    <label class="form-field">
                        <span>상단 여백(px)</span>
                        <input data-wizard-crop-edge="top" type="number" min="0" max="${imageSize.height}" step="1" value="${Math.round(edges.top)}">
                    </label>
                    <label class="form-field">
                        <span>우측 여백(px)</span>
                        <input data-wizard-crop-edge="right" type="number" min="0" max="${imageSize.width}" step="1" value="${Math.round(edges.right)}">
                    </label>
                    <label class="form-field">
                        <span>하단 여백(px)</span>
                        <input data-wizard-crop-edge="bottom" type="number" min="0" max="${imageSize.height}" step="1" value="${Math.round(edges.bottom)}">
                    </label>
                    <button type="button" class="toolbar-btn" data-wizard-action="crop-full">전체 참조 도면</button>
                    <button type="button" class="toolbar-btn" data-wizard-action="crop-center">중앙 90%</button>
                    <div class="info-card full">
                        <p class="status-line">파란 박스는 참조 도면에서 실제 배치 영역으로 매핑할 실내 외곽 영역입니다. 여백, 치수선, 라벨, 발코니나 복도 등 배치와 무관한 영역은 제외해 주세요.</p>
                    </div>
                </div>
            </div>
        `;
    }

    function renderWizardDimensionOptions() {
        const dimensions = state.wizard.dimensions || [];
        if (!dimensions.length) return emptyState('감지된 치수 후보가 없습니다. 다음 단계에서 직접 입력하세요.');
        return `<div class="dimension-grid">${dimensions.slice(0, 9).map((dimension) => `
            <button type="button" class="dimension-option ${state.wizard.selectedDimensionMm === dimension.mm ? 'active' : ''}" data-wizard-dimension="${dimension.mm}">
                <strong>${escapeHtml(dimension.raw)}</strong>
                <small>${formatMm(dimension.mm)}</small>
            </button>
        `).join('')}</div>`;
    }

    function renderWizardFurnitureStep() {
        const drafts = state.wizard.furnitureDrafts || [];
        const draft = state.wizard.newFurniture;
        const presetDrafts = drafts.filter((item) => item.isPreset);
        const includedCount = drafts.filter((item) => item.included).length;
        return `
            <div class="wizard-furniture-step">
                <div class="info-card wizard-flow-intro">
                    <p class="panel-kicker">Furniture Library</p>
                    <h3>초기 가구 보관함 설정</h3>
                    <p class="status-line">직접 추가하거나 프리셋을 고른 뒤, 아래 목록에서 이번 워크스페이스에 포함할 가구를 정리합니다.</p>
                </div>
                <div class="wizard-new-furniture wizard-flow-panel">
                    <div class="wizard-section-title">
                        <h3>직접 가구 추가</h3>
                        <button type="button" class="toolbar-btn" data-wizard-action="add-furniture-draft">
                            <i data-lucide="package-plus" aria-hidden="true"></i>
                            <span>보관함에 추가</span>
                        </button>
                    </div>
                    <div class="wizard-compact-add">
                        <label class="form-field add-name-field">
                            <span>가구명</span>
                            <input data-wizard-new-furniture="name" type="text" value="${escapeHtml(draft.name)}" placeholder="예: 모니터 선반">
                        </label>
                        <label class="wizard-color-chip" title="색상">
                            <input data-wizard-new-furniture="color" type="color" value="${escapeHtml(draft.color)}" aria-label="가구 색상">
                        </label>
                        <label class="form-field">
                            <span>종류</span>
                            <select data-wizard-new-furniture="category">${renderCategoryOptions(draft.category)}</select>
                        </label>
                        <label class="form-field">
                            <span>가로(mm)</span>
                            <input data-wizard-new-furniture="widthMm" type="number" min="1" step="1" value="${round(draft.widthMm || 0, 0)}">
                        </label>
                        <label class="form-field">
                            <span>세로(mm)</span>
                            <input data-wizard-new-furniture="depthMm" type="number" min="1" step="1" value="${round(draft.depthMm || 0, 0)}">
                        </label>
                        <label class="form-field">
                            <span>높이(mm)</span>
                            <input data-wizard-new-furniture="heightMm" type="number" min="0" step="1" value="${round(draft.heightMm || 0, 0)}">
                        </label>
                        <details class="wizard-optional-fields">
                            <summary>제조사/모델/메모</summary>
                            <div>
                                <label class="form-field">
                                    <span>제조사명(선택)</span>
                                    <input data-wizard-new-furniture="manufacturer" type="text" value="${escapeHtml(draft.manufacturer)}">
                                </label>
                                <label class="form-field">
                                    <span>모델명(선택)</span>
                                    <input data-wizard-new-furniture="modelName" type="text" value="${escapeHtml(draft.modelName)}">
                                </label>
                                <label class="form-field">
                                    <span>메모</span>
                                    <textarea data-wizard-new-furniture="memo">${escapeHtml(draft.memo || '')}</textarea>
                                </label>
                            </div>
                        </details>
                    </div>
                </div>
                <div class="wizard-preset-strip wizard-flow-panel">
                    <div class="wizard-section-title">
                        <h3>프리셋 빠른 선택</h3>
                        <span>${includedCount}개 포함</span>
                    </div>
                    <div class="wizard-preset-chip-row">
                        ${presetDrafts.map((item) => `
                            <button type="button" class="wizard-preset-chip ${item.included ? 'included' : ''}" data-wizard-action="toggle-furniture-included" data-wizard-furniture-id="${escapeHtml(item.id)}">
                                <span class="mini-color-dot" style="background:${escapeHtml(item.color)}"></span>
                                <strong>${escapeHtml(item.name)}</strong>
                                <small>${item.included ? '포함' : '제외'}</small>
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="wizard-included-panel wizard-flow-panel">
                    <div class="wizard-section-title">
                        <h3>포함될 가구 목록</h3>
                        <span>${drafts.length}개 후보</span>
                    </div>
                    <div class="wizard-furniture-list">
                        ${drafts.map((item) => `
                            <article class="wizard-furniture-card ${item.included ? 'included' : 'excluded'}" data-wizard-furniture-id="${escapeHtml(item.id)}">
                                <div class="wizard-card-head">
                                    <button type="button" class="include-pill ${item.included ? 'on' : ''}" data-wizard-action="toggle-furniture-included" data-wizard-furniture-id="${escapeHtml(item.id)}">${item.included ? '포함' : '제외'}</button>
                                    <span class="mini-color-dot" style="background:${escapeHtml(item.color)}"></span>
                                    <strong>${escapeHtml(item.name)}</strong>
                                    <button type="button" class="mini-btn danger-btn" data-wizard-action="remove-furniture-draft" data-wizard-furniture-id="${escapeHtml(item.id)}">삭제</button>
                                </div>
                                <div class="wizard-card-fields">
                                    <label class="form-field">
                                        <span>가구명</span>
                                        <input data-wizard-furniture-field="name" data-wizard-furniture-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(item.name)}">
                                    </label>
                                    <label class="form-field">
                                        <span>종류</span>
                                        <select data-wizard-furniture-field="category" data-wizard-furniture-id="${escapeHtml(item.id)}">
                                            ${renderCategoryOptions(item.category)}
                                        </select>
                                    </label>
                                    <label class="form-field">
                                        <span>가로(mm)</span>
                                        <input data-wizard-furniture-field="widthMm" data-wizard-furniture-id="${escapeHtml(item.id)}" type="number" min="1" step="1" value="${round(item.widthMm, 0)}">
                                    </label>
                                    <label class="form-field">
                                        <span>세로(mm)</span>
                                        <input data-wizard-furniture-field="depthMm" data-wizard-furniture-id="${escapeHtml(item.id)}" type="number" min="1" step="1" value="${round(item.depthMm, 0)}">
                                    </label>
                                    <label class="form-field">
                                        <span>높이(mm)</span>
                                        <input data-wizard-furniture-field="heightMm" data-wizard-furniture-id="${escapeHtml(item.id)}" type="number" min="0" step="1" value="${round(item.heightMm || 0, 0)}">
                                    </label>
                                    <label class="wizard-color-chip" title="색상">
                                        <input data-wizard-furniture-field="color" data-wizard-furniture-id="${escapeHtml(item.id)}" type="color" value="${escapeHtml(item.color)}" aria-label="가구 색상">
                                    </label>
                                </div>
                            </article>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function handleWizardInput(event) {
        const field = event.target.dataset.wizardField;
        const cropEdge = event.target.dataset.wizardCropEdge;
        const furnitureField = event.target.dataset.wizardFurnitureField;
        const newFurnitureField = event.target.dataset.wizardNewFurniture;
        if (field) {
            if (field === 'includePresets') {
                state.wizard.includePresets = event.target.checked;
            } else if (field === 'widthValue' || field === 'heightValue') {
                state.wizard[field] = positiveNumber(event.target.value, state.wizard[field]);
            } else if (field === 'unit') {
                state.wizard.unit = event.target.value;
            } else {
                state.wizard[field] = event.target.value;
            }
        }
        if (cropEdge) {
            updateWizardCropFromEdges(cropEdge, event.target.value);
            updateWizardCropBoxPreview();
        }
        if (furnitureField) {
            updateWizardFurnitureDraft(event.target.dataset.wizardFurnitureId, furnitureField, event.target);
        }
        if (newFurnitureField) {
            updateWizardNewFurnitureDraft(newFurnitureField, event.target);
        }
    }

    function handleWizardChange(event) {
        if (event.target.id === 'wizardFloorplanInput') {
            handleWizardFile(event.target.files?.[0]);
            event.target.value = '';
            return;
        }
        if (event.target.dataset.wizardAction === 'orientation' && event.target.value === 'swap') {
            const width = state.wizard.widthValue;
            state.wizard.widthValue = state.wizard.heightValue;
            state.wizard.heightValue = width;
            renderWizard();
        }
        if (event.target.dataset.wizardField === 'unit') {
            renderWizard();
        }
        if (event.target.dataset.wizardCropEdge) {
            const imageSize = state.wizard.imageSize;
            if (imageSize) state.wizard.crop = normalizeCrop(state.wizard.crop, imageSize);
            renderWizard();
        }
    }

    function handleWizardClick(event) {
        const dimensionButton = event.target.closest('[data-wizard-dimension]');
        const action = event.target.closest('[data-wizard-action]')?.dataset.wizardAction;
        if (dimensionButton) {
            const mm = positiveNumber(dimensionButton.dataset.wizardDimension, null);
            state.wizard.selectedDimensionMm = mm;
            state.wizard.selectedDimensionCm = mmToCm(mm);
            renderWizard();
        }
        if (action === 'crop-full') {
            setWizardCropFull();
            renderWizard();
        }
        if (action === 'crop-center') {
            setWizardCropCenter();
            renderWizard();
        }
        if (action === 'add-furniture-draft') {
            addWizardFurnitureDraft();
        }
        if (action === 'remove-furniture-draft') {
            removeWizardFurnitureDraft(event.target.closest('[data-wizard-furniture-id]')?.dataset.wizardFurnitureId);
        }
        if (action === 'toggle-furniture-included') {
            toggleWizardFurnitureIncluded(event.target.closest('[data-wizard-furniture-id]')?.dataset.wizardFurnitureId);
        }
    }

    function handleWizardDragOver(event) {
        if (!event.target.closest('.upload-card')) return;
        event.preventDefault();
        event.target.closest('.upload-card').classList.add('drag-over');
    }

    function handleWizardDragLeave(event) {
        event.target.closest('.upload-card')?.classList.remove('drag-over');
    }

    function handleWizardDrop(event) {
        const uploadCard = event.target.closest('.upload-card');
        if (!uploadCard) return;
        event.preventDefault();
        uploadCard.classList.remove('drag-over');
        handleWizardFile(event.dataTransfer.files?.[0]);
    }

    function handleWizardPointerDown(event) {
        const handle = event.target.closest('[data-crop-handle]');
        if (!handle || state.wizard.step !== 4 || !state.wizard.imageSize) return;
        const preview = event.target.closest('.calibration-preview');
        if (!preview) return;
        const pointer = getPreviewImagePoint(event, preview);
        state.wizardCropDrag = {
            handle: handle.dataset.cropHandle,
            preview,
            startPointer: pointer,
            startCrop: { ...normalizeCrop(state.wizard.crop, state.wizard.imageSize) }
        };
        preview.classList.add('is-dragging');
        updateWizardCropLoupe(event, handle.dataset.cropHandle);
        event.preventDefault();
    }

    function handleWizardPointerMove(event) {
        const drag = state.wizardCropDrag;
        if (!drag || !state.wizard.imageSize) return;
        const point = getPreviewImagePoint(event, drag.preview);
        const dx = point.x - drag.startPointer.x;
        const dy = point.y - drag.startPointer.y;
        let { x, y, width, height } = drag.startCrop;
        const right = x + width;
        const bottom = y + height;
        const handle = drag.handle;

        if (handle === 'move') {
            x += dx;
            y += dy;
            state.wizard.crop = normalizeCrop({
                x: clamp(x, 0, state.wizard.imageSize.width - width),
                y: clamp(y, 0, state.wizard.imageSize.height - height),
                width,
                height
            }, state.wizard.imageSize);
            updateWizardCropBoxPreview();
            updateWizardCropLoupe(event, drag.handle);
            event.preventDefault();
            return;
        } else {
            if (handle.includes('w')) x += dx;
            if (handle.includes('n')) y += dy;
            if (handle.includes('e')) width = right + dx - x;
            if (handle.includes('s')) height = bottom + dy - y;
            if (handle.includes('w')) width = right - x;
            if (handle.includes('n')) height = bottom - y;
        }

        state.wizard.crop = normalizeCrop({ x, y, width, height }, state.wizard.imageSize);
        updateWizardCropBoxPreview();
        updateWizardCropLoupe(event, drag.handle);
        event.preventDefault();
    }

    function handleWizardPointerUp() {
        if (!state.wizardCropDrag) return;
        state.wizardCropDrag.preview?.classList.remove('is-dragging');
        state.wizardCropDrag = null;
        renderWizard();
    }

    function updateWizardCropLoupe(event, handle) {
        const loupe = dom.wizardBody.querySelector('.crop-loupe');
        if (!loupe || !state.wizard.imageSize) return;
        const preview = event.target.closest?.('.calibration-preview') || state.wizardCropDrag?.preview;
        if (!preview) return;
        const rect = preview.getBoundingClientRect();
        const x = clamp(event.clientX - rect.left, 18, rect.width - 18);
        const y = clamp(event.clientY - rect.top, 18, rect.height - 18);
        const crop = normalizeCrop(state.wizard.crop, state.wizard.imageSize);
        const zoom = 2.65;
        const point = getPreviewImagePoint(event, preview);
        const imageSize = state.wizard.imageSize;
        const bgWidth = rect.width * zoom;
        const bgHeight = rect.height * zoom;
        loupe.style.left = `${x}px`;
        loupe.style.top = `${y}px`;
        loupe.style.backgroundImage = state.wizard.dataUrl ? `url("${state.wizard.dataUrl}")` : '';
        loupe.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
        loupe.style.backgroundPosition = `${37 - (point.x / imageSize.width) * bgWidth}px ${37 - (point.y / imageSize.height) * bgHeight}px`;
        loupe.dataset.label = `${formatCropHandle(handle)} · ${Math.round(crop.width)}x${Math.round(crop.height)}px`;
    }

    function formatCropHandle(handle) {
        return {
            move: '이동',
            n: '상단',
            e: '우측',
            s: '하단',
            w: '좌측',
            nw: '좌상단',
            ne: '우상단',
            se: '우하단',
            sw: '좌하단'
        }[handle] || '기준선';
    }

    function getPreviewImagePoint(event, preview) {
        const rect = preview.getBoundingClientRect();
        const imageSize = state.wizard.imageSize || { width: 1, height: 1 };
        return {
            x: clamp(((event.clientX - rect.left) / rect.width) * imageSize.width, 0, imageSize.width),
            y: clamp(((event.clientY - rect.top) / rect.height) * imageSize.height, 0, imageSize.height)
        };
    }

    function updateWizardCropFromEdges(edge, value) {
        const imageSize = state.wizard.imageSize;
        if (!imageSize) return;
        const current = normalizeCrop(state.wizard.crop, imageSize);
        const edges = cropToEdges(current, imageSize);
        edges[edge] = clamp(numberOr(value, edges[edge]), 0, edge === 'left' || edge === 'right' ? imageSize.width - 1 : imageSize.height - 1);
        if (edges.left + edges.right >= imageSize.width) edges[edge] = edge === 'left' ? imageSize.width - edges.right - 1 : imageSize.width - edges.left - 1;
        if (edges.top + edges.bottom >= imageSize.height) edges[edge] = edge === 'top' ? imageSize.height - edges.bottom - 1 : imageSize.height - edges.top - 1;
        state.wizard.crop = normalizeCrop(edgesToCrop(edges, imageSize), imageSize);
    }

    function updateWizardCropBoxPreview() {
        const imageSize = state.wizard.imageSize;
        if (!imageSize) return;
        const crop = normalizeCrop(state.wizard.crop, imageSize);
        const box = dom.wizardBody.querySelector('.crop-box');
        if (box) {
            box.style.left = `${(crop.x / imageSize.width) * 100}%`;
            box.style.top = `${(crop.y / imageSize.height) * 100}%`;
            box.style.width = `${(crop.width / imageSize.width) * 100}%`;
            box.style.height = `${(crop.height / imageSize.height) * 100}%`;
        }
        const edges = cropToEdges(crop, imageSize);
        dom.wizardBody.querySelectorAll('[data-wizard-crop-edge]').forEach((input) => {
            if (document.activeElement === input && !state.wizardCropDrag) return;
            input.value = Math.round(edges[input.dataset.wizardCropEdge]);
        });
    }

    function updateWizardFurnitureDraft(id, field, target) {
        const draft = state.wizard.furnitureDrafts.find((item) => item.id === id);
        if (!draft) return;
        if (field === 'included') draft.included = target.checked;
        else if (['widthMm', 'depthMm', 'heightMm'].includes(field)) draft[field] = numberOr(target.value, draft[field]);
        else if (field === 'category') {
            draft.category = target.value;
            draft.categoryLabel = getCategoryLabel(target.value);
            if (!draft.color) draft.color = getCategoryColor(target.value);
        } else {
            draft[field] = target.value;
        }
    }

    function updateWizardNewFurnitureDraft(field, target) {
        const draft = state.wizard.newFurniture;
        if (['widthMm', 'depthMm', 'heightMm'].includes(field)) draft[field] = numberOr(target.value, draft[field]);
        else if (field === 'category') {
            draft.category = target.value;
            draft.categoryLabel = getCategoryLabel(target.value);
            draft.color = draft.color || getCategoryColor(target.value);
        } else {
            draft[field] = target.value;
        }
    }

    function addWizardFurnitureDraft() {
        const draft = normalizeWizardFurnitureDraft(state.wizard.newFurniture);
        if (!draft.name || draft.widthMm <= 0 || draft.depthMm <= 0) {
            setStartStatus('직접 추가할 가구명과 가로/세로 mm 치수를 입력해주세요.', 'error');
            return;
        }
        state.wizard.furnitureDrafts.push({ ...draft, id: uid('wizard-furniture'), included: true, isPreset: false });
        state.wizard.newFurniture = createEmptyWizardFurnitureDraft(false);
        renderWizard();
    }

    function removeWizardFurnitureDraft(id) {
        state.wizard.furnitureDrafts = state.wizard.furnitureDrafts.filter((item) => item.id !== id);
        renderWizard();
    }

    function toggleWizardFurnitureIncluded(id) {
        const draft = state.wizard.furnitureDrafts.find((item) => item.id === id);
        if (!draft) return;
        draft.included = !draft.included;
        renderWizard();
    }

    async function handleWizardFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            setStartStatus('이미지 파일만 도면으로 사용할 수 있습니다.', 'error');
            return;
        }

        try {
            state.wizard.fileName = file.name;
            state.wizard.fileType = file.type;
            state.wizard.dataUrl = await readFileAsDataURL(file);
            state.wizard.imageSize = await getImageSize(state.wizard.dataUrl);
            const baseName = file.name.replace(/\.[^.]+$/, '') || '기본 도면';
            state.wizard.projectName = baseName;
            state.wizard.workspaceName = '새 워크스페이스';
            state.wizard.floorplanName = baseName;
            setWizardCropFull();
            renderWizard();
            runWizardOcr();
        } catch (error) {
            setStartStatus(`도면 이미지를 열지 못했습니다: ${error.message}`, 'error');
        }
    }

    async function runWizardOcr() {
        if (!state.wizard.dataUrl) return;
        const dataUrl = state.wizard.dataUrl;
        state.wizard.analysisStatus = 'analyzing';
        renderWizard();

        const tesseract = await waitForGlobal('Tesseract', 5000);
        if (!tesseract || state.wizard.dataUrl !== dataUrl) {
            state.wizard.analysisStatus = 'unavailable';
            renderWizard();
            return;
        }

        try {
            const result = await tesseract.recognize(dataUrl, 'eng');
            if (state.wizard.dataUrl !== dataUrl) return;
            state.wizard.rawText = result?.data?.text || '';
            state.wizard.dimensions = parseDimensions(state.wizard.rawText);
            state.wizard.analysisStatus = state.wizard.dimensions.length ? 'detected' : 'empty';
            state.wizard.selectedDimensionMm = state.wizard.dimensions[0]?.mm || null;
            state.wizard.selectedDimensionCm = mmToCm(state.wizard.selectedDimensionMm);
            renderWizard();
        } catch (error) {
            state.wizard.analysisStatus = 'failed';
            renderWizard();
        }
    }

    function moveWizardBack() {
        if (state.wizard.step > 1) {
            state.wizard.step -= 1;
            renderWizard();
        }
    }

    function moveWizardNext() {
        if (!validateWizardStep()) return;
        if (state.wizard.step < 5) {
            state.wizard.step += 1;
            renderWizard();
            return;
        }
        createProjectFromWizard();
    }

    function validateWizardStep() {
        if (state.wizard.step === 1) {
            if (!state.wizard.dataUrl) {
                setStartStatus('도면 이미지를 먼저 선택해주세요.', 'error');
                return false;
            }
            if (!state.wizard.workspaceName.trim() || !state.wizard.floorplanName.trim()) {
                setStartStatus('워크스페이스명과 도면명을 입력해주세요.', 'error');
                return false;
            }
        }
        if (state.wizard.step === 3) {
            const widthMm = unitToMm(state.wizard.widthValue, state.wizard.unit);
            const heightMm = unitToMm(state.wizard.heightValue, state.wizard.unit);
            if (widthMm <= 0 || heightMm <= 0) {
                setStartStatus('실제 워크스페이스 크기를 입력해주세요.', 'error');
                return false;
            }
        }
        return true;
    }

    function createProjectFromWizard() {
        const now = new Date().toISOString();
        const projectId = uid('project');
        const workspaceId = uid('workspace');
        const floorplanId = uid('floorplan');
        const widthMm = unitToMm(state.wizard.widthValue, state.wizard.unit);
        const heightMm = unitToMm(state.wizard.heightValue, state.wizard.unit);
        const widthCm = mmToCm(widthMm);
        const heightCm = mmToCm(heightMm);
        const imageSize = state.wizard.imageSize;
        const crop = normalizeCrop(state.wizard.crop, imageSize);
        const presets = createFurnitureFromWizardDrafts(projectId);
        const calibration = {
            mode: state.wizard.selectedDimensionMm ? 'ocr-assisted' : 'manual',
            imageCrop: crop,
            referenceLine: state.wizard.selectedDimensionMm ? {
                x1: crop.x,
                y1: crop.y,
                x2: crop.x + crop.width,
                y2: crop.y,
                realLengthMm: state.wizard.selectedDimensionMm,
                realLengthCm: mmToCm(state.wizard.selectedDimensionMm)
            } : null,
            structureHints: {
                rooms: [],
                referenceLines: [],
                notes: ['수동 기준 영역으로 실제 배치 영역을 매핑했습니다.']
            }
        };
        const referenceImage = {
            storagePath: null,
            dataUrl: state.wizard.dataUrl,
            name: state.wizard.floorplanName.trim(),
            sourceFileName: state.wizard.fileName,
            type: state.wizard.fileType,
            width: imageSize.width,
            height: imageSize.height,
            opacity: 0.55,
            visible: true
        };

        state.project = {
            schemaVersion: SCHEMA_VERSION,
            appVersion: APP_VERSION,
            service: 'Layoutstudio',
            engine: 'SPACE',
            ownerId: state.currentUser?.id || null,
            project: {
                id: projectId,
                name: state.wizard.workspaceName.trim(),
                createdAt: now,
                updatedAt: now
            },
            workspace: {
                id: workspaceId,
                projectId,
                name: state.wizard.workspaceName.trim(),
                floorplanName: state.wizard.floorplanName.trim(),
                widthMm,
                heightMm,
                widthCm,
                heightCm,
                unit: 'mm',
                gridSizeMm: 500,
                gridSizeCm: 50,
                gridVisible: true,
                zoom: 1,
                view: { zoom: 1, panX: 0, panY: 0 },
                activeFloorplanId: floorplanId,
                structureLayer: { rooms: [] },
                floorplans: [{
                    id: floorplanId,
                    workspaceId,
                    name: state.wizard.floorplanName.trim(),
                    role: 'primary',
                    referenceImage,
                    calibration,
                    structureLayer: { rooms: [] },
                    createdAt: now,
                    updatedAt: now
                }],
                calibration,
                referenceImage
            },
            analysis: {
                status: state.wizard.analysisStatus,
                rawText: state.wizard.rawText,
                dimensions: state.wizard.dimensions,
                selectedDimensionMm: state.wizard.selectedDimensionMm,
                selectedDimensionCm: state.wizard.selectedDimensionCm
            },
            furnitureCatalog: presets,
            placements: []
        };

        syncProjectMeasurements(state.project);
        state.selectedPlacementId = null;
        state.selectedStructureId = null;
        closeWorkspaceWizard();
        openStudio();
        saveProjectNow();
        setCanvasStatus('실측 좌표 워크스페이스를 생성했습니다.', 'success');
    }

    function setWizardCropFull() {
        const imageSize = state.wizard.imageSize;
        if (!imageSize) return;
        state.wizard.crop = { x: 0, y: 0, width: imageSize.width, height: imageSize.height };
    }

    function setWizardCropCenter() {
        const imageSize = state.wizard.imageSize;
        if (!imageSize) return;
        const width = imageSize.width * 0.9;
        const height = imageSize.height * 0.9;
        state.wizard.crop = {
            x: (imageSize.width - width) / 2,
            y: (imageSize.height - height) / 2,
            width,
            height
        };
    }

    function openFurnitureModal(furnitureId = null) {
        if (!state.project) {
            setStartStatus('워크스페이스를 먼저 생성하거나 불러와주세요.', 'error');
            return;
        }

        state.furnitureMode = furnitureId ? 'edit' : 'create';
        state.editingFurnitureId = furnitureId;
        const item = furnitureId ? getFurniture(furnitureId) : null;

        dom.furnitureModalTitle.textContent = item ? '보관함 가구 수정' : '가구 추가';
        dom.furnitureNameInput.value = item?.name || '';
        dom.furnitureCategoryInput.value = item?.category || 'desk';
        dom.furnitureCustomCategoryInput.value = item?.category === 'other' ? item.categoryLabel : '';
        dom.furnitureManufacturerInput.value = item?.manufacturer || '';
        dom.furnitureModelInput.value = item?.modelName || '';
        dom.furnitureWidthInput.value = item ? getFurnitureWidthMm(item) : '';
        dom.furnitureDepthInput.value = item ? getFurnitureDepthMm(item) : '';
        dom.furnitureHeightInput.value = item ? getFurnitureHeightMm(item) : '';
        dom.furnitureColorInput.value = item?.color || getCategoryColor(item?.category || 'desk');
        dom.furnitureMemoInput.value = item?.memo || '';
        renderCustomCategoryField();
        dom.furnitureModal.classList.add('open');
        dom.furnitureModal.setAttribute('aria-hidden', 'false');
        dom.furnitureNameInput.focus();
    }

    function closeFurnitureModal() {
        dom.furnitureModal.classList.remove('open');
        dom.furnitureModal.setAttribute('aria-hidden', 'true');
        state.furnitureMode = 'create';
        state.editingFurnitureId = null;
        state.pendingFurnitureDraft = null;
    }

    function renderCustomCategoryField() {
        dom.customCategoryField.classList.toggle('active', dom.furnitureCategoryInput.value === 'other');
    }

    function handleFurnitureSubmit(event) {
        event.preventDefault();
        const draft = readFurnitureForm();
        if (!draft) return;

        if (state.furnitureMode === 'edit' && state.editingFurnitureId) {
            const linkedCount = state.project.placements.filter((placement) => placement.furnitureId === state.editingFurnitureId).length;
            if (linkedCount) {
                state.pendingFurnitureDraft = draft;
                openConfirmModal({
                    title: '기존 배치 항목 반영',
                    message: `이미 이 가구를 사용해 배치한 항목이 ${linkedCount}개 있습니다. 기존 배치 항목에도 변경사항을 적용할까요?`,
                    actions: [
                        { label: '배치 항목에도 적용', variant: 'active-filter', handler: () => saveFurnitureDraft(true) },
                        { label: '보관함만 수정', handler: () => saveFurnitureDraft(false) },
                        { label: '취소', variant: 'ghost' }
                    ]
                });
                return;
            }
            state.pendingFurnitureDraft = draft;
            saveFurnitureDraft(false);
            return;
        }

        state.project.furnitureCatalog.push({
            ...draft,
            id: uid('furniture'),
            projectId: state.project.project.id,
            isPreset: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        closeFurnitureModal();
        afterProjectMutation('가구가 보관함에 추가되었습니다.');
    }

    function readFurnitureForm() {
        const category = dom.furnitureCategoryInput.value;
        const categoryLabel = category === 'other'
            ? dom.furnitureCustomCategoryInput.value.trim() || '기타'
            : getCategoryLabel(category);
        const widthMm = positiveNumber(dom.furnitureWidthInput.value, 0);
        const depthMm = positiveNumber(dom.furnitureDepthInput.value, 0);
        const heightMm = numberOr(dom.furnitureHeightInput.value, 0);
        const name = dom.furnitureNameInput.value.trim();

        if (!name || widthMm <= 0 || depthMm <= 0) {
            setCanvasStatus('가구 이름과 mm 단위 가로/세로 크기를 입력해주세요.', 'error');
            return null;
        }

        return {
            name,
            category,
            categoryLabel,
            manufacturer: dom.furnitureManufacturerInput.value.trim(),
            modelName: dom.furnitureModelInput.value.trim(),
            widthMm,
            depthMm,
            heightMm: Math.max(0, heightMm),
            widthCm: mmToCm(widthMm),
            depthCm: mmToCm(depthMm),
            color: dom.furnitureColorInput.value || getCategoryColor(category),
            memo: dom.furnitureMemoInput.value.trim()
        };
    }

    function saveFurnitureDraft(applyToPlacements) {
        const draft = state.pendingFurnitureDraft;
        const item = getFurniture(state.editingFurnitureId);
        if (!draft || !item) return;

        Object.assign(item, draft, { updatedAt: new Date().toISOString() });
        if (applyToPlacements) {
            state.project.placements
                .filter((placement) => placement.furnitureId === item.id)
                .forEach((placement) => Object.assign(placement, {
                    name: draft.name,
                    category: draft.category,
                    categoryLabel: draft.categoryLabel,
                    manufacturer: draft.manufacturer,
                    modelName: draft.modelName,
                    widthMm: draft.widthMm,
                    depthMm: draft.depthMm,
                    heightMm: draft.heightMm,
                    widthCm: draft.widthCm,
                    depthCm: draft.depthCm,
                    color: draft.color,
                    memo: draft.memo,
                    updatedAt: new Date().toISOString()
                }));
        }
        closeFurnitureModal();
        closeConfirmModal();
        afterProjectMutation('가구 정보를 수정했습니다.');
    }

    function handleInventoryDragStart(event) {
        const item = event.target.closest('[data-furniture-id]');
        if (!item) return;
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-layoutstudio-furniture', item.dataset.furnitureId);
        event.dataTransfer.setData('text/plain', item.dataset.furnitureId);
    }

    function handleInventoryClick(event) {
        const button = event.target.closest('[data-action]');
        if (!button || !state.project) return;
        const furnitureId = button.dataset.furnitureId;
        const action = button.dataset.action;

        if (action === 'place') {
            const furniture = getFurniture(furnitureId);
            placeFurniture(furnitureId, (getWorkspaceWidthMm(state.project.workspace) - getFurnitureWidthMm(furniture)) / 2, (getWorkspaceHeightMm(state.project.workspace) - getFurnitureDepthMm(furniture)) / 2);
        }
        if (action === 'edit') openFurnitureModal(furnitureId);
        if (action === 'duplicate') duplicateFurniture(furnitureId);
        if (action === 'delete') confirmDeleteFurniture(furnitureId);
    }

    function duplicateFurniture(furnitureId) {
        const item = getFurniture(furnitureId);
        if (!item) return;
        state.project.furnitureCatalog.push({
            ...item,
            id: uid('furniture'),
            name: `${item.name} 복사본`,
            isPreset: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        afterProjectMutation('보관함 가구를 복제했습니다.');
    }

    function confirmDeleteFurniture(furnitureId) {
        const linkedCount = state.project.placements.filter((placement) => placement.furnitureId === furnitureId).length;
        openConfirmModal({
            title: '가구 삭제',
            message: linkedCount
                ? `이 가구를 사용한 배치 항목 ${linkedCount}개가 있습니다. 보관함 원본만 삭제하면 배치 항목은 독립 가구로 유지됩니다.`
                : '보관함에서 이 가구를 삭제할까요?',
            actions: [
                linkedCount ? { label: '보관함만 삭제', variant: 'active-filter', handler: () => deleteFurniture(furnitureId, false) } : null,
                linkedCount ? { label: '배치까지 삭제', variant: 'danger-btn', handler: () => deleteFurniture(furnitureId, true) } : { label: '삭제', variant: 'danger-btn', handler: () => deleteFurniture(furnitureId, false) },
                { label: '취소' }
            ].filter(Boolean)
        });
    }

    function deleteFurniture(furnitureId, removePlacements = false) {
        state.project.furnitureCatalog = state.project.furnitureCatalog.filter((item) => item.id !== furnitureId);
        if (removePlacements) {
            state.project.placements = state.project.placements.filter((placement) => placement.furnitureId !== furnitureId);
        } else {
            state.project.placements
                .filter((placement) => placement.furnitureId === furnitureId)
                .forEach((placement) => {
                    placement.furnitureId = null;
                    placement.updatedAt = new Date().toISOString();
                });
        }
        if (!getSelectedPlacement()) state.selectedPlacementId = null;
        closeConfirmModal();
        afterProjectMutation(removePlacements ? '가구와 연결된 배치 항목을 삭제했습니다.' : '보관함 가구를 삭제하고 기존 배치는 독립 항목으로 유지했습니다.');
    }

    function addDefaultPresets() {
        if (!state.project) return;
        const presets = createPresetFurniture(state.project.project.id).filter((preset) => !state.project.furnitureCatalog.some((item) =>
            item.name === preset.name
            && item.category === preset.category
            && Number(getFurnitureWidthMm(item)) === Number(getFurnitureWidthMm(preset))
            && Number(getFurnitureDepthMm(item)) === Number(getFurnitureDepthMm(preset))
        ));
        if (!presets.length) {
            setCanvasStatus('이미 같은 기본 프리셋이 보관함에 있습니다.', 'success');
            return;
        }
        state.project.furnitureCatalog.push(...presets);
        afterProjectMutation('기본 예시 가구 프리셋을 추가했습니다.');
    }

    function createPresetFurniture(projectId) {
        const now = new Date().toISOString();
        return DEFAULT_FURNITURE_PRESETS.map((preset) => ({
            id: uid('furniture'),
            projectId,
            name: preset.name,
            category: preset.category,
            categoryLabel: getCategoryLabel(preset.category),
            manufacturer: preset.manufacturer || '',
            modelName: preset.modelName || '',
            widthMm: preset.widthMm,
            depthMm: preset.depthMm,
            heightMm: preset.heightMm || 0,
            widthCm: mmToCm(preset.widthMm),
            depthCm: mmToCm(preset.depthMm),
            color: preset.color,
            memo: preset.memo || '',
            isPreset: true,
            createdAt: now,
            updatedAt: now
        }));
    }

    function handleCanvasDrop(event) {
        event.preventDefault();
        dom.canvasDropzone.classList.remove('drag-over');
        if (!state.project || !state.canvas) return;

        const furnitureId = event.dataTransfer.getData('application/x-layoutstudio-furniture') || event.dataTransfer.getData('text/plain');
        const furniture = getFurniture(furnitureId);
        if (!furniture) return;

        const rect = state.canvas.upperCanvasEl.getBoundingClientRect();
        const point = canvasPointToMm(event.clientX - rect.left, event.clientY - rect.top);
        const xMm = point.xMm - getFurnitureWidthMm(furniture) / 2;
        const yMm = point.yMm - getFurnitureDepthMm(furniture) / 2;
        placeFurniture(furnitureId, xMm, yMm);
    }

    function placeFurniture(furnitureId, xMm, yMm) {
        const furniture = getFurniture(furnitureId);
        if (!furniture) return;

        const zIndex = getNextZIndex();
        const widthMm = getFurnitureWidthMm(furniture);
        const depthMm = getFurnitureDepthMm(furniture);
        const placement = {
            id: uid('placement'),
            projectId: state.project.project.id,
            workspaceId: state.project.workspace.id,
            furnitureId,
            name: furniture.name,
            category: furniture.category,
            categoryLabel: furniture.categoryLabel,
            manufacturer: furniture.manufacturer || '',
            modelName: furniture.modelName || '',
            widthMm,
            depthMm,
            heightMm: getFurnitureHeightMm(furniture),
            widthCm: mmToCm(widthMm),
            depthCm: mmToCm(depthMm),
            xMm: clamp(xMm, 0, Math.max(0, getWorkspaceWidthMm(state.project.workspace) - widthMm)),
            yMm: clamp(yMm, 0, Math.max(0, getWorkspaceHeightMm(state.project.workspace) - depthMm)),
            xCm: mmToCm(clamp(xMm, 0, Math.max(0, getWorkspaceWidthMm(state.project.workspace) - widthMm))),
            yCm: mmToCm(clamp(yMm, 0, Math.max(0, getWorkspaceHeightMm(state.project.workspace) - depthMm))),
            rotationDeg: 0,
            color: furniture.color,
            memo: furniture.memo || '',
            zIndex,
            locked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        state.project.placements.push(placement);
        state.selectedPlacementId = placement.id;
        afterProjectMutation('가구를 워크스페이스에 배치했습니다.');
    }

    function handleCanvasSelection(event) {
        const object = event.selected?.[0] || event.target;
        const type = object?.data?.type;
        state.selectedPlacementId = type === 'placement' ? object.data.placementId : null;
        state.selectedStructureId = type === 'room' ? object.data.roomId : null;
        renderInspector();
    }

    function handleCanvasObjectChange(object, shouldPersist) {
        if (object?.data?.type === 'room') {
            updateStructureRoomFromObject(object, shouldPersist);
            return;
        }
        updatePlacementFromObject(object, shouldPersist);
    }

    function updatePlacementFromObject(object, shouldPersist) {
        const placement = getPlacement(object?.data?.placementId);
        if (!placement || placement.locked) return;

        const point = canvasPointToMm(object.left, object.top);
        placement.xMm = round(point.xMm - getPlacementWidthMm(placement) / 2, 0);
        placement.yMm = round(point.yMm - getPlacementDepthMm(placement) / 2, 0);
        placement.xCm = mmToCm(placement.xMm);
        placement.yCm = mmToCm(placement.yMm);
        placement.updatedAt = new Date().toISOString();
        state.selectedPlacementId = placement.id;
        state.selectedStructureId = null;

        if (isPlacementOutOfBounds(placement)) {
            setCanvasStatus('선택한 가구가 워크스페이스 경계를 벗어났습니다.', 'error');
        } else {
            setCanvasStatus('가구 위치를 조정했습니다.', 'success');
        }

        if (shouldPersist) {
            saveProjectNow();
            renderInspector();
        } else {
            syncInspectorPosition(placement);
            scheduleSave();
        }
    }

    function updateStructureRoomFromObject(object, shouldPersist) {
        const room = getStructureRoom(object?.data?.roomId);
        if (!room) return;
        const point = canvasPointToMm(object.left, object.top);
        room.xMm = round(point.xMm - getRoomWidthMm(room) / 2, 0);
        room.yMm = round(point.yMm - getRoomHeightMm(room) / 2, 0);
        room.xCm = mmToCm(room.xMm);
        room.yCm = mmToCm(room.yMm);
        room.updatedAt = new Date().toISOString();
        state.selectedStructureId = room.id;
        state.selectedPlacementId = null;
        if (shouldPersist) {
            saveProjectNow();
            renderInspector();
        } else {
            syncInspectorRoomPosition(room);
            scheduleSave();
        }
    }

    function handleInspectorInput(event) {
        const field = event.target.dataset.placementField;
        const roomField = event.target.dataset.roomField;
        if (roomField) {
            handleRoomInspectorInput(event, roomField);
            return;
        }
        const placement = getSelectedPlacement();
        if (!field || !placement) return;

        if (field === 'locked') {
            placement.locked = event.target.checked;
        } else if (field === 'category') {
            placement.category = event.target.value;
            placement.categoryLabel = getCategoryLabel(event.target.value);
        } else if (field === 'name' || field === 'memo' || field === 'color') {
            placement[field] = event.target.value;
        } else if (field === 'rotationRange') {
            placement.rotationDeg = normalizeAngle(event.target.value);
            syncRotationInputs(placement.rotationDeg);
        } else if (field === 'rotationDeg') {
            placement.rotationDeg = normalizeAngle(event.target.value);
            syncRotationInputs(placement.rotationDeg);
        } else if (field === 'xMm' || field === 'yMm') {
            placement[field] = numberOr(event.target.value, placement[field]);
            placement[field.replace('Mm', 'Cm')] = mmToCm(placement[field]);
        } else if (field === 'widthMm' || field === 'depthMm' || field === 'heightMm') {
            placement[field] = field === 'heightMm'
                ? Math.max(0, numberOr(event.target.value, placement[field] || 0))
                : positiveNumber(event.target.value, placement[field]);
            if (field === 'widthMm') placement.widthCm = mmToCm(placement.widthMm);
            if (field === 'depthMm') placement.depthCm = mmToCm(placement.depthMm);
        } else {
            placement[field] = positiveNumber(event.target.value, placement[field]);
        }

        placement.updatedAt = new Date().toISOString();
        scheduleSave();
        renderWorkspace();
        renderProjectSummary();
    }

    function handleInspectorClick(event) {
        const action = event.target.closest('[data-inspector-action]')?.dataset.inspectorAction;
        const roomAction = event.target.closest('[data-room-action]')?.dataset.roomAction;
        if (roomAction) {
            handleRoomInspectorAction(roomAction);
            return;
        }
        const placement = getSelectedPlacement();
        if (!action || !placement) return;

        if (action === 'rotate-minus') rotatePlacement(placement, -15);
        if (action === 'rotate-plus') rotatePlacement(placement, 15);
        if (action === 'rotate-90') setPlacementRotation(placement, 90);
        if (action === 'rotate-zero') setPlacementRotation(placement, 0);
        if (action === 'duplicate') duplicatePlacement(placement.id);
        if (action === 'unlink') unlinkPlacementSource(placement.id);
        if (action === 'delete') deletePlacement(placement.id);
        if (action === 'front') movePlacementLayer(placement.id, 'front');
        if (action === 'back') movePlacementLayer(placement.id, 'back');
    }

    function unlinkPlacementSource(placementId) {
        const placement = getPlacement(placementId);
        if (!placement) return;
        placement.furnitureId = null;
        placement.updatedAt = new Date().toISOString();
        afterProjectMutation('선택한 배치 항목을 보관함 원본과 분리했습니다.');
    }

    function syncInspectorPosition(placement) {
        const xInput = dom.inspectorPanel.querySelector('[data-placement-field="xMm"]');
        const yInput = dom.inspectorPanel.querySelector('[data-placement-field="yMm"]');
        if (xInput) xInput.value = round(getPlacementXMm(placement), 0);
        if (yInput) yInput.value = round(getPlacementYMm(placement), 0);
    }

    function syncInspectorRoomPosition(room) {
        const xInput = dom.inspectorPanel.querySelector('[data-room-field="xMm"]');
        const yInput = dom.inspectorPanel.querySelector('[data-room-field="yMm"]');
        if (xInput) xInput.value = round(getRoomXMm(room), 0);
        if (yInput) yInput.value = round(getRoomYMm(room), 0);
    }

    function syncRotationInputs(rotationDeg) {
        dom.inspectorPanel.querySelectorAll('[data-placement-field="rotationDeg"], [data-placement-field="rotationRange"]').forEach((input) => {
            input.value = round(normalizeAngle(rotationDeg), 1);
        });
    }

    function rotatePlacement(placement, delta) {
        setPlacementRotation(placement, normalizeAngle(placement.rotationDeg + delta));
    }

    function setPlacementRotation(placement, angle) {
        placement.rotationDeg = normalizeAngle(angle);
        placement.updatedAt = new Date().toISOString();
        syncRotationInputs(placement.rotationDeg);
        afterProjectMutation(`가구를 ${round(placement.rotationDeg, 1)}도로 회전했습니다.`);
    }

    function duplicatePlacement(placementId) {
        const placement = getPlacement(placementId);
        if (!placement) return;
        const clone = {
            ...placement,
            id: uid('placement'),
            xMm: clamp(getPlacementXMm(placement) + 200, 0, Math.max(0, getWorkspaceWidthMm(state.project.workspace) - getPlacementWidthMm(placement))),
            yMm: clamp(getPlacementYMm(placement) + 200, 0, Math.max(0, getWorkspaceHeightMm(state.project.workspace) - getPlacementDepthMm(placement))),
            xCm: mmToCm(clamp(getPlacementXMm(placement) + 200, 0, Math.max(0, getWorkspaceWidthMm(state.project.workspace) - getPlacementWidthMm(placement)))),
            yCm: mmToCm(clamp(getPlacementYMm(placement) + 200, 0, Math.max(0, getWorkspaceHeightMm(state.project.workspace) - getPlacementDepthMm(placement)))),
            zIndex: getNextZIndex(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        state.project.placements.push(clone);
        state.selectedPlacementId = clone.id;
        afterProjectMutation('배치된 가구를 복제했습니다.');
    }

    function deletePlacement(placementId) {
        state.project.placements = state.project.placements.filter((placement) => placement.id !== placementId);
        state.selectedPlacementId = null;
        afterProjectMutation('배치된 가구를 삭제했습니다.');
    }

    function movePlacementLayer(placementId, direction) {
        const placement = getPlacement(placementId);
        if (!placement) return;
        placement.zIndex = direction === 'front' ? getNextZIndex() : getLowestZIndex() - 1;
        placement.updatedAt = new Date().toISOString();
        afterProjectMutation(direction === 'front' ? '앞으로 가져왔습니다.' : '뒤로 보냈습니다.');
    }

    function handleKeyboardShortcuts(event) {
        if (!state.project || !state.selectedPlacementId || isTypingTarget(event.target) || isModalOpen()) return;
        const placement = getSelectedPlacement();
        if (!placement || placement.locked) return;

        const step = event.shiftKey ? 100 : 10;
        let handled = false;

        if (event.key === 'ArrowLeft') {
            placement.xMm = getPlacementXMm(placement) - step;
            handled = true;
        }
        if (event.key === 'ArrowRight') {
            placement.xMm = getPlacementXMm(placement) + step;
            handled = true;
        }
        if (event.key === 'ArrowUp') {
            placement.yMm = getPlacementYMm(placement) - step;
            handled = true;
        }
        if (event.key === 'ArrowDown') {
            placement.yMm = getPlacementYMm(placement) + step;
            handled = true;
        }
        const isRotateKey = event.code === 'KeyR' || event.key.toLowerCase() === 'r' || event.key === 'ㄱ';
        if (isRotateKey) {
            placement.rotationDeg = normalizeAngle(placement.rotationDeg + (event.shiftKey ? -15 : 15));
            handled = true;
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            deletePlacement(placement.id);
            event.preventDefault();
            return;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
            duplicatePlacement(placement.id);
            event.preventDefault();
            return;
        }

        if (handled) {
            event.preventDefault();
            placement.xMm = round(clamp(placement.xMm, 0, Math.max(0, getWorkspaceWidthMm(state.project.workspace) - getPlacementWidthMm(placement))), 0);
            placement.yMm = round(clamp(placement.yMm, 0, Math.max(0, getWorkspaceHeightMm(state.project.workspace) - getPlacementDepthMm(placement))), 0);
            placement.xCm = mmToCm(placement.xMm);
            placement.yCm = mmToCm(placement.yMm);
            placement.updatedAt = new Date().toISOString();
            renderWorkspace();
            renderInspector();
            renderProjectSummary();
            if (isRotateKey) setCanvasStatus(`회전 ${round(normalizeAngle(placement.rotationDeg), 0)}도`, 'success');
            scheduleSave();
        }
    }

    function openProjectSettings() {
        if (!state.project) return;
        const { project, workspace } = state.project;
        ensureWorkspaceFloorplans(workspace);
        const crop = workspace.calibration.imageCrop;
        const imageSize = {
            width: workspace.referenceImage.width,
            height: workspace.referenceImage.height
        };
        const cropEdges = cropToEdges(crop, imageSize);
        dom.settingsForm.innerHTML = `
            <div class="settings-form-inner">
                <label class="form-field">
                    <span>워크스페이스명</span>
                    <input name="workspaceName" type="text" value="${escapeHtml(workspace.name)}" required>
                </label>
                <label class="form-field">
                    <span>도면명</span>
                    <input name="floorplanName" type="text" value="${escapeHtml(getFloorplanName(state.project))}" required>
                </label>
                <label class="form-field">
                    <span>실제 배치 영역 가로(mm)</span>
                    <input name="widthMm" type="number" min="1" step="1" value="${round(getWorkspaceWidthMm(workspace), 0)}" required>
                </label>
                <label class="form-field">
                    <span>실제 배치 영역 세로(mm)</span>
                    <input name="heightMm" type="number" min="1" step="1" value="${round(getWorkspaceHeightMm(workspace), 0)}" required>
                </label>
                <label class="form-field">
                    <span>크기 변경 시 좌표</span>
                    <select name="resizeMode">
                        <option value="keep">기존 좌표 유지</option>
                        <option value="scale">새 크기에 맞춰 비율 보정</option>
                    </select>
                </label>
                <label class="form-field">
                    <span>실측 그리드 단위</span>
                    <select name="gridSizeMm">
                        <option value="500" ${(workspace.gridSizeMm || cmToMm(workspace.gridSizeCm)) === 500 ? 'selected' : ''}>500mm</option>
                        <option value="1000" ${(workspace.gridSizeMm || cmToMm(workspace.gridSizeCm)) === 1000 ? 'selected' : ''}>1000mm</option>
                    </select>
                </label>
                <label class="toggle-field">
                    <span>참조 도면 표시</span>
                    <input name="referenceVisible" type="checkbox" ${workspace.referenceImage.visible ? 'checked' : ''}>
                </label>
                <label class="form-field">
                    <span>참조 도면 투명도</span>
                    <input name="referenceOpacity" type="range" min="0" max="100" step="1" value="${Math.round(workspace.referenceImage.opacity * 100)}">
                </label>
                <div class="crop-control-grid settings-wide">
                    <label class="form-field">
                        <span>좌측 여백(px)</span>
                        <input name="cropLeft" type="number" min="0" step="1" value="${Math.round(cropEdges.left)}">
                    </label>
                    <label class="form-field">
                        <span>상단 여백(px)</span>
                        <input name="cropTop" type="number" min="0" step="1" value="${Math.round(cropEdges.top)}">
                    </label>
                    <label class="form-field">
                        <span>우측 여백(px)</span>
                        <input name="cropRight" type="number" min="0" step="1" value="${Math.round(cropEdges.right)}">
                    </label>
                    <label class="form-field">
                        <span>하단 여백(px)</span>
                        <input name="cropBottom" type="number" min="0" step="1" value="${Math.round(cropEdges.bottom)}">
                    </label>
                </div>
                <div class="info-card settings-wide">
                    <p class="status-line">참조 도면의 도면 기준 영역은 실제 배치 영역으로 맞춰 표시됩니다. 기준 영역을 다시 보정해도 가구의 실측 좌표, 크기, 회전은 그대로 유지됩니다.</p>
                </div>
                <div class="info-card settings-wide">
                    <p class="status-line">Version ${APP_VERSION} · 생성 ${formatDate(project.createdAt)} · 수정 ${formatDate(project.updatedAt)}</p>
                </div>
                <div class="modal-actions full">
                    <button type="button" class="toolbar-btn danger-btn" id="settingsDeleteButton">워크스페이스 삭제</button>
                    <button type="button" class="toolbar-btn" id="settingsCancelButton">취소</button>
                    <button type="submit" class="toolbar-btn active-filter">설정 저장</button>
                </div>
            </div>
        `;
        dom.settingsForm.querySelector('#settingsCancelButton').addEventListener('click', closeProjectSettings);
        dom.settingsForm.querySelector('#settingsDeleteButton').addEventListener('click', () => requestDeleteProject(state.project.project.id));
        dom.projectSettingsModal.classList.add('open');
        dom.projectSettingsModal.setAttribute('aria-hidden', 'false');
        refreshIcons();
    }

    function closeProjectSettings() {
        dom.projectSettingsModal.classList.remove('open');
        dom.projectSettingsModal.setAttribute('aria-hidden', 'true');
    }

    function handleSettingsPreview(event) {
        if (event.target.name === 'referenceOpacity') {
            state.project.workspace.referenceImage.opacity = clamp(Number(event.target.value) / 100, 0, 1);
            syncWorkspaceMirrorToActiveFloorplan(state.project.workspace);
            renderWorkspace();
        }
    }

    function applyProjectSettings(event) {
        event.preventDefault();
        if (!state.project) return;
        const data = new FormData(dom.settingsForm);
        const oldWidth = getWorkspaceWidthMm(state.project.workspace);
        const oldHeight = getWorkspaceHeightMm(state.project.workspace);
        const newWidth = positiveNumber(data.get('widthMm'), oldWidth);
        const newHeight = positiveNumber(data.get('heightMm'), oldHeight);
        const resizeMode = data.get('resizeMode');

        state.project.workspace.name = String(data.get('workspaceName') || '').trim() || state.project.workspace.name;
        state.project.project.name = state.project.workspace.name;
        state.project.workspace.floorplanName = String(data.get('floorplanName') || '').trim() || getFloorplanName(state.project);
        state.project.workspace.referenceImage.name = state.project.workspace.floorplanName;
        state.project.workspace.widthMm = newWidth;
        state.project.workspace.heightMm = newHeight;
        state.project.workspace.widthCm = mmToCm(newWidth);
        state.project.workspace.heightCm = mmToCm(newHeight);
        state.project.workspace.unit = 'mm';
        state.project.workspace.gridSizeMm = Number(data.get('gridSizeMm')) || 500;
        state.project.workspace.gridSizeCm = mmToCm(state.project.workspace.gridSizeMm);
        state.project.workspace.referenceImage.visible = data.get('referenceVisible') === 'on';
        state.project.workspace.referenceImage.opacity = clamp(Number(data.get('referenceOpacity')) / 100, 0, 1);

        const imageSize = {
            width: state.project.workspace.referenceImage.width,
            height: state.project.workspace.referenceImage.height
        };
        state.project.workspace.calibration.imageCrop = normalizeCrop(edgesToCrop({
            left: numberOr(data.get('cropLeft'), 0),
            top: numberOr(data.get('cropTop'), 0),
            right: numberOr(data.get('cropRight'), 0),
            bottom: numberOr(data.get('cropBottom'), 0)
        }, imageSize), imageSize);
        syncWorkspaceMirrorToActiveFloorplan(state.project.workspace);

        if (resizeMode === 'scale' && (newWidth !== oldWidth || newHeight !== oldHeight)) {
            state.project.placements.forEach((placement) => {
                placement.xMm = round(getPlacementXMm(placement) * (newWidth / oldWidth), 0);
                placement.yMm = round(getPlacementYMm(placement) * (newHeight / oldHeight), 0);
                placement.xCm = mmToCm(placement.xMm);
                placement.yCm = mmToCm(placement.yMm);
                placement.updatedAt = new Date().toISOString();
            });
        }

        closeProjectSettings();
        afterProjectMutation('워크스페이스 설정을 저장했습니다.', true);
    }

    function handleFloorplanPanelInput(event) {
        if (!state.project) return;
        const field = event.target.dataset.floorplanField;
        if (field === 'referenceVisible') {
            state.project.workspace.referenceImage.visible = event.target.checked;
        }
        if (field === 'referenceOpacity') {
            state.project.workspace.referenceImage.opacity = clamp(Number(event.target.value) / 100, 0, 1);
        }
        syncWorkspaceMirrorToActiveFloorplan(state.project.workspace);
        afterProjectMutation('참조 도면 설정을 저장했습니다.');
    }

    function handleFloorplanPanelClick(event) {
        const action = event.target.closest('[data-floorplan-action]')?.dataset.floorplanAction;
        if (action === 'settings') {
            openProjectSettings();
        }
        if (action === 'add-room') {
            addStructureRoom();
        }
    }

    function adjustZoom(delta) {
        if (!state.project) return;
        const view = getWorkspaceView(state.project.workspace);
        setWorkspaceZoom(state.project.workspace, clamp(round(view.zoom + delta, 2), 0.35, 3));
        afterProjectMutation('화면 배율을 조정했습니다.');
    }

    function fitWorkspaceView() {
        if (!state.project) return;
        setWorkspaceZoom(state.project.workspace, 1);
        state.project.workspace.view.panX = 0;
        state.project.workspace.view.panY = 0;
        afterProjectMutation('워크스페이스를 화면에 맞췄습니다.');
    }

    function toggleGrid() {
        if (!state.project) return;
        state.project.workspace.gridVisible = !state.project.workspace.gridVisible;
        afterProjectMutation(state.project.workspace.gridVisible ? '그리드를 표시합니다.' : '그리드를 숨깁니다.');
    }

    function toggleReference() {
        if (!state.project) return;
        state.project.workspace.referenceImage.visible = !state.project.workspace.referenceImage.visible;
        afterProjectMutation(state.project.workspace.referenceImage.visible ? '참조 도면을 표시합니다.' : '참조 도면을 숨깁니다.');
    }

    function openAuthModal() {
        renderAuthBody();
        dom.authModal.classList.add('open');
        dom.authModal.setAttribute('aria-hidden', 'false');
    }

    function closeAuthModal() {
        dom.authModal.classList.remove('open');
        dom.authModal.setAttribute('aria-hidden', 'true');
    }

    function renderAuthBody() {
        if (state.currentUser) {
            dom.authBody.innerHTML = `
                <div class="info-card">
                    <p class="panel-kicker">Signed In</p>
                    <h3>${escapeHtml(state.currentUser.email)}</h3>
                    <p class="status-line">현재 정적 알파에서는 사용자별 LocalStorage 영역을 분리합니다. 운영 저장소가 붙을 때도 소유자 기준으로 데이터 접근을 제한해야 합니다.</p>
                </div>
                <div class="modal-actions">
                    <button type="button" class="toolbar-btn danger-btn" data-auth-action="logout">로그아웃</button>
                </div>
            `;
            return;
        }

        dom.authBody.innerHTML = `
            <div class="auth-mode-row">
                <button type="button" class="tab-btn ${state.authMode === 'login' ? 'active' : ''}" data-auth-mode="login">로그인</button>
                <button type="button" class="tab-btn ${state.authMode === 'signup' ? 'active' : ''}" data-auth-mode="signup">회원가입</button>
            </div>
            <form class="auth-form" data-auth-form="${state.authMode}">
                <label class="form-field full">
                    <span>이메일</span>
                    <input name="email" type="email" autocomplete="email" required>
                </label>
                <label class="form-field full">
                    <span>비밀번호</span>
                    <input name="password" type="password" autocomplete="${state.authMode === 'signup' ? 'new-password' : 'current-password'}" required>
                </label>
                <div class="info-card full">
                    <p class="status-line">이 알파의 계정 기능은 로컬 저장 구조 검증용입니다. 운영 DB 저장은 본인 데이터만 접근할 수 있는 권한 정책이 필요합니다.</p>
                </div>
                <div class="modal-actions full">
                    <button type="submit" class="toolbar-btn active-filter">${state.authMode === 'signup' ? '회원가입' : '로그인'}</button>
                </div>
            </form>
        `;
    }

    function handleAuthClick(event) {
        const mode = event.target.closest('[data-auth-mode]')?.dataset.authMode;
        const action = event.target.closest('[data-auth-action]')?.dataset.authAction;
        if (mode) {
            state.authMode = mode;
            renderAuthBody();
        }
        if (action === 'logout') logout();
    }

    async function handleAuthSubmit(event) {
        const form = event.target.closest('[data-auth-form]');
        if (!form) return;
        event.preventDefault();
        const data = new FormData(form);
        const email = String(data.get('email') || '').trim().toLowerCase();
        const password = String(data.get('password') || '');
        const users = readUsers();
        const passwordHash = await hashPassword(password);

        if (form.dataset.authForm === 'signup') {
            if (users.some((user) => user.email === email)) {
                setAuthMessage('이미 가입된 이메일입니다.', 'error');
                return;
            }
            const user = { id: uid('user'), email, passwordHash, createdAt: new Date().toISOString() };
            users.push(user);
            writeUsers(users);
            setCurrentUser(user);
            closeAuthModal();
            renderAll();
            setSaveStatus('saved');
            return;
        }

        const user = users.find((item) => item.email === email && item.passwordHash === passwordHash);
        if (!user) {
            setAuthMessage('이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
            return;
        }
        setCurrentUser(user);
        closeAuthModal();
        renderAll();
        setSaveStatus('saved');
    }

    function setAuthMessage(message, type) {
        const existing = dom.authBody.querySelector('.auth-message');
        if (existing) existing.remove();
        dom.authBody.insertAdjacentHTML('afterbegin', `<p class="status-line auth-message ${type === 'error' ? 'is-error' : 'is-success'}">${escapeHtml(message)}</p>`);
    }

    function loadSession() {
        try {
            const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
            const users = readUsers();
            state.currentUser = users.find((user) => user.id === session?.userId) || null;
        } catch {
            state.currentUser = null;
        }
    }

    function setCurrentUser(user) {
        state.currentUser = user ? { id: user.id, email: user.email } : null;
        if (state.currentUser) {
            localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: state.currentUser.id }));
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    }

    function logout() {
        setCurrentUser(null);
        closeAuthModal();
        state.project = null;
        state.selectedPlacementId = null;
        showStart();
        renderAll();
        setSaveStatus('login-required');
    }

    function readUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function writeUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function restoreLastProjectFromStorage() {
        const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
        if (!lastProjectId) return false;
        const project = readProjectList().find((item) => item.project.id === lastProjectId);
        if (!project) return false;
        state.project = normalizeProject(project);
        state.selectedPlacementId = null;
        return true;
    }

    async function hashPassword(password) {
        if (window.crypto?.subtle) {
            const bytes = new TextEncoder().encode(password);
            const buffer = await window.crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
        }
        return btoa(unescape(encodeURIComponent(password)));
    }

    async function handleProjectImport(event) {
        const [file] = Array.from(event.target.files || []);
        event.target.value = '';
        if (!file) return;

        try {
            const text = await readFileAsText(file);
            state.project = normalizeProject(JSON.parse(text));
            state.project.ownerId = state.currentUser?.id || null;
            state.selectedPlacementId = null;
            openStudio();
            saveProjectNow();
            setCanvasStatus('JSON 워크스페이스를 가져왔습니다.', 'success');
        } catch (error) {
            setStartStatus(`JSON 파일을 가져오지 못했습니다: ${error.message}`, 'error');
            setCanvasStatus(`JSON 파일을 가져오지 못했습니다: ${error.message}`, 'error');
        }
    }

    function exportProjectJson() {
        if (!state.project) {
            setStartStatus('내보낼 워크스페이스가 없습니다.', 'error');
            return;
        }
        touchProject();
        const payload = JSON.stringify(state.project, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${slugify(state.project.workspace.name)}.layoutstudio.json`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 500);
        saveProjectNow();
        setCanvasStatus('JSON 파일로 내보냈습니다.', 'success');
    }

    function saveProjectNow() {
        if (!state.project) return;
        setSaveStatus('saving');
        try {
            touchProject();
            const projects = readProjectList();
            const index = projects.findIndex((project) => project.project.id === state.project.project.id);
            if (index >= 0) projects[index] = state.project;
            else projects.push(state.project);
            localStorage.setItem(projectStorageKey(), JSON.stringify(projects));
            localStorage.setItem(LAST_PROJECT_KEY, state.project.project.id);
            setSaveStatus('saved');
            renderStartDashboard();
        } catch (error) {
            setSaveStatus('failed');
            setCanvasStatus(`자동 저장 실패: ${error.message}`, 'error');
        }
    }

    function requestDeleteProject(projectId) {
        const project = readProjectList().find((item) => item.project.id === projectId)
            || (state.project?.project.id === projectId ? state.project : null);
        if (!project) return;
        openConfirmModal({
            title: '워크스페이스 삭제',
            message: `"${project.workspace.name}" 워크스페이스를 삭제합니다. 브라우저 임시 저장에서 제거되며, 필요한 경우 먼저 JSON 내보내기로 백업하세요.`,
            actions: [
                { label: '삭제', variant: 'danger-btn', handler: () => deleteProject(projectId) },
                { label: '취소' }
            ]
        });
    }

    function deleteProject(projectId) {
        const projects = readProjectList().filter((project) => project.project.id !== projectId);
        localStorage.setItem(projectStorageKey(), JSON.stringify(projects));
        if (localStorage.getItem(LAST_PROJECT_KEY) === projectId) {
            localStorage.removeItem(LAST_PROJECT_KEY);
        }
        const deletedCurrent = state.project?.project.id === projectId;
        if (deletedCurrent) {
            state.project = null;
            state.selectedPlacementId = null;
            closeProjectSettings();
            showStart();
        }
        closeConfirmModal();
        renderAll();
        setStartStatus('워크스페이스를 삭제했습니다.', 'success');
    }

    function scheduleSave(delay = 600) {
        window.clearTimeout(state.saveTimer);
        setSaveStatus('saving');
        state.saveTimer = window.setTimeout(saveProjectNow, delay);
    }

    function touchProject() {
        if (!state.project) return;
        const now = new Date().toISOString();
        state.project.project.updatedAt = now;
        state.project.workspace.updatedAt = now;
        state.project.appVersion = APP_VERSION;
        state.project.schemaVersion = SCHEMA_VERSION;
        syncProjectMeasurements(state.project);
        syncWorkspaceMirrorToActiveFloorplan(state.project.workspace);
    }

    function readProjectList() {
        try {
            return JSON.parse(localStorage.getItem(projectStorageKey()) || '[]').map(normalizeProject);
        } catch {
            return [];
        }
    }

    function projectStorageKey() {
        return `${PROJECTS_KEY}:${state.currentUser?.id || 'guest'}`;
    }

    function setSaveStatus(status) {
        state.saveStatus = status;
        const labelByStatus = {
            saving: '저장 중',
            saved: state.currentUser ? '저장됨' : '오프라인 임시 저장',
            failed: '저장 실패',
            'login-required': '로그인 필요'
        };
        const text = labelByStatus[status] || '대기';
        dom.saveStatusBadge.textContent = text;
        dom.saveStatusBadge.className = `save-status-badge is-${status}`;
    }

    function getSaveStatusLabel() {
        return {
            saving: '저장 중',
            saved: state.currentUser ? '저장됨' : '오프라인 임시 저장',
            failed: '저장 실패',
            'login-required': '로그인 필요'
        }[state.saveStatus] || '대기';
    }

    function normalizeProject(raw) {
        if (!raw || typeof raw !== 'object') throw new Error('워크스페이스 JSON 구조가 올바르지 않습니다.');
        if (raw.project && raw.workspace) return normalizeModernProject(raw);
        return normalizeLegacyProject(raw);
    }

    function normalizeModernProject(raw) {
        const now = new Date().toISOString();
        const projectId = raw.project.id || raw.projectId || uid('project');
        const workspaceId = raw.workspace.id || uid('workspace');
        const referenceImage = raw.workspace.referenceImage || raw.referenceImage || {};
        if (!referenceImage.dataUrl) throw new Error('참조 도면 이미지 데이터가 없습니다.');
        const imageSize = {
            width: positiveNumber(referenceImage.width, raw.image?.width || 1200),
            height: positiveNumber(referenceImage.height, raw.image?.height || 800)
        };

        const workspace = {
            id: workspaceId,
            projectId,
            name: raw.workspace.name || '새 워크스페이스',
            floorplanName: raw.workspace.floorplanName || referenceImage.name || raw.image?.name || '기본 도면',
            widthMm: measurementToMm(raw.workspace.widthMm, raw.workspace.widthCm, 6000),
            heightMm: measurementToMm(raw.workspace.heightMm, raw.workspace.heightCm, 4400),
            widthCm: mmToCm(measurementToMm(raw.workspace.widthMm, raw.workspace.widthCm, 6000)),
            heightCm: mmToCm(measurementToMm(raw.workspace.heightMm, raw.workspace.heightCm, 4400)),
            unit: 'mm',
            gridSizeMm: measurementToMm(raw.workspace.gridSizeMm, raw.workspace.gridSizeCm, 500),
            gridSizeCm: mmToCm(measurementToMm(raw.workspace.gridSizeMm, raw.workspace.gridSizeCm, 500)),
            gridVisible: raw.workspace.gridVisible !== false,
            zoom: positiveNumber(raw.workspace.zoom, 1),
            view: normalizeWorkspaceView(raw.workspace.view, raw.workspace.zoom),
            calibration: {
                mode: raw.workspace.calibration?.mode || 'manual',
                imageCrop: normalizeCrop(raw.workspace.calibration?.imageCrop || {
                    x: 0,
                    y: 0,
                    width: imageSize.width,
                    height: imageSize.height
                }, imageSize),
                referenceLine: raw.workspace.calibration?.referenceLine || null
            },
            referenceImage: {
                storagePath: referenceImage.storagePath || null,
                dataUrl: referenceImage.dataUrl,
                name: referenceImage.name || raw.workspace.floorplanName || raw.image?.name || '기본 도면',
                sourceFileName: referenceImage.sourceFileName || raw.image?.name || referenceImage.name || 'floorplan',
                type: referenceImage.type || raw.image?.type || 'image/png',
                width: imageSize.width,
                height: imageSize.height,
                opacity: clamp(numberOr(referenceImage.opacity, 0.55), 0, 1),
                visible: referenceImage.visible !== false
            },
            activeFloorplanId: raw.workspace.activeFloorplanId || null,
            floorplans: Array.isArray(raw.workspace.floorplans) ? raw.workspace.floorplans : [],
            structureLayer: normalizeStructureLayer(raw.workspace.structureLayer),
            createdAt: raw.workspace.createdAt || raw.project.createdAt || now,
            updatedAt: raw.workspace.updatedAt || raw.project.updatedAt || now
        };
        ensureWorkspaceFloorplans(workspace);

        const catalog = Array.isArray(raw.furnitureCatalog)
            ? raw.furnitureCatalog.map((item) => normalizeFurnitureItem(item, projectId))
            : [];
        const placements = Array.isArray(raw.placements)
            ? raw.placements.map((placement, index) => normalizePlacement(placement, projectId, workspaceId, catalog, index)).filter(Boolean)
            : [];

        const project = {
            schemaVersion: SCHEMA_VERSION,
            appVersion: APP_VERSION,
            service: 'Layoutstudio',
            engine: 'SPACE',
            ownerId: raw.ownerId || state.currentUser?.id || null,
            project: {
                id: projectId,
                name: raw.project.name || raw.projectName || 'Layoutstudio Project',
                createdAt: raw.project.createdAt || now,
                updatedAt: raw.project.updatedAt || now
            },
            workspace,
            analysis: {
                status: raw.analysis?.status || 'loaded',
                rawText: raw.analysis?.rawText || '',
                dimensions: Array.isArray(raw.analysis?.dimensions) ? raw.analysis.dimensions : [],
                selectedDimensionCm: raw.analysis?.selectedDimensionCm || null
            },
            furnitureCatalog: catalog,
            placements
        };
        syncProjectMeasurements(project);
        return project;
    }

    function normalizeLegacyProject(raw) {
        if (!raw.image?.dataUrl) throw new Error('도면 이미지 데이터가 없습니다.');
        const projectId = raw.projectId || uid('project');
        const workspaceId = uid('workspace');
        const imageSize = {
            width: positiveNumber(raw.image.width, 1200),
            height: positiveNumber(raw.image.height, 800)
        };
        const legacyCatalog = Array.isArray(raw.inventory) ? raw.inventory : [];
        const catalog = legacyCatalog.map((item) => normalizeFurnitureItem(item, projectId));
        const placements = Array.isArray(raw.placements)
            ? raw.placements.map((placement, index) => normalizePlacement(placement, projectId, workspaceId, catalog, index)).filter(Boolean)
            : [];
        const now = new Date().toISOString();

        const project = {
            schemaVersion: SCHEMA_VERSION,
            appVersion: APP_VERSION,
            service: 'Layoutstudio',
            engine: 'SPACE',
            ownerId: state.currentUser?.id || null,
            project: {
                id: projectId,
                name: raw.projectName || 'Layoutstudio Project',
                createdAt: raw.createdAt || now,
                updatedAt: raw.updatedAt || now
            },
            workspace: {
                id: workspaceId,
                projectId,
                name: raw.workspace?.name || '새 워크스페이스',
                floorplanName: raw.workspace?.floorplanName || raw.image.name || '기본 도면',
                widthMm: measurementToMm(raw.workspace?.widthMm, raw.workspace?.widthCm, 6000),
                heightMm: measurementToMm(raw.workspace?.heightMm, raw.workspace?.heightCm, 4400),
                widthCm: mmToCm(measurementToMm(raw.workspace?.widthMm, raw.workspace?.widthCm, 6000)),
                heightCm: mmToCm(measurementToMm(raw.workspace?.heightMm, raw.workspace?.heightCm, 4400)),
                unit: 'mm',
                gridSizeMm: 500,
                gridSizeCm: 50,
                gridVisible: true,
                zoom: 1,
                view: { zoom: 1, panX: 0, panY: 0 },
                calibration: {
                    mode: 'manual',
                    imageCrop: { x: 0, y: 0, width: imageSize.width, height: imageSize.height },
                    referenceLine: null,
                    structureHints: { rooms: [], referenceLines: [], notes: ['Legacy project imported with full image as 기준 영역.'] }
                },
                referenceImage: {
                    storagePath: null,
                    dataUrl: raw.image.dataUrl,
                    name: raw.workspace?.floorplanName || raw.image.name || '기본 도면',
                    sourceFileName: raw.image.name || 'floorplan',
                    type: raw.image.type || 'image/png',
                    width: imageSize.width,
                    height: imageSize.height,
                    opacity: 0.55,
                    visible: true
                },
                activeFloorplanId: null,
                floorplans: [],
                structureLayer: normalizeStructureLayer(raw.workspace?.structureLayer),
                createdAt: raw.createdAt || now,
                updatedAt: raw.updatedAt || now
            },
            analysis: {
                status: raw.analysis?.status || 'loaded',
                rawText: raw.analysis?.rawText || '',
                dimensions: Array.isArray(raw.analysis?.dimensions) ? raw.analysis.dimensions : [],
                selectedDimensionCm: null
            },
            furnitureCatalog: catalog,
            placements
        };
        ensureWorkspaceFloorplans(project.workspace);
        syncProjectMeasurements(project);
        return project;
    }

    function normalizeWorkspaceView(view, fallbackZoom = 1) {
        const zoom = clamp(numberOr(view?.zoom ?? fallbackZoom, 1), 0.35, 3);
        return {
            zoom,
            panX: Math.max(0, numberOr(view?.panX, 0)),
            panY: Math.max(0, numberOr(view?.panY, 0))
        };
    }

    function normalizeFloorplanRecord(raw, workspace) {
        const now = new Date().toISOString();
        const reference = raw?.referenceImage || workspace.referenceImage || {};
        const imageSize = {
            width: positiveNumber(reference.width, workspace.referenceImage?.width || 1200),
            height: positiveNumber(reference.height, workspace.referenceImage?.height || 800)
        };
        const calibration = raw?.calibration || workspace.calibration || {};

        return {
            id: raw?.id || uid('floorplan'),
            workspaceId: workspace.id,
            name: raw?.name || workspace.floorplanName || reference.name || '기본 도면',
            role: raw?.role || 'primary',
            referenceImage: {
                storagePath: reference.storagePath || null,
                dataUrl: reference.dataUrl || workspace.referenceImage?.dataUrl,
                name: reference.name || raw?.name || workspace.floorplanName || '기본 도면',
                sourceFileName: reference.sourceFileName || reference.name || 'floorplan',
                type: reference.type || 'image/png',
                width: imageSize.width,
                height: imageSize.height,
                opacity: clamp(numberOr(reference.opacity, 0.55), 0, 1),
                visible: reference.visible !== false
            },
            calibration: {
                mode: calibration.mode || 'manual',
                imageCrop: normalizeCrop(calibration.imageCrop || { x: 0, y: 0, width: imageSize.width, height: imageSize.height }, imageSize),
                referenceLine: calibration.referenceLine || null,
                structureHints: calibration.structureHints || { rooms: [], referenceLines: [], notes: [] }
            },
            structureLayer: normalizeStructureLayer(raw?.structureLayer || calibration.structureLayer || workspace.structureLayer),
            createdAt: raw?.createdAt || workspace.createdAt || now,
            updatedAt: raw?.updatedAt || workspace.updatedAt || now
        };
    }

    function ensureWorkspaceFloorplans(workspace = state.project?.workspace) {
        if (!workspace) return [];
        workspace.view = normalizeWorkspaceView(workspace.view, workspace.zoom);
        workspace.zoom = workspace.view.zoom;

        const sourceFloorplans = Array.isArray(workspace.floorplans) && workspace.floorplans.length
            ? workspace.floorplans
            : [{ name: workspace.floorplanName, referenceImage: workspace.referenceImage, calibration: workspace.calibration }];
        workspace.floorplans = sourceFloorplans.map((floorplan) => normalizeFloorplanRecord(floorplan, workspace));
        if (!workspace.activeFloorplanId || !workspace.floorplans.some((floorplan) => floorplan.id === workspace.activeFloorplanId)) {
            workspace.activeFloorplanId = workspace.floorplans[0]?.id || null;
        }
        syncActiveFloorplanToWorkspace(workspace);
        return workspace.floorplans;
    }

    function getActiveFloorplan(workspace = state.project?.workspace) {
        const floorplans = ensureWorkspaceFloorplans(workspace);
        return floorplans.find((floorplan) => floorplan.id === workspace.activeFloorplanId) || floorplans[0] || null;
    }

    function syncActiveFloorplanToWorkspace(workspace = state.project?.workspace) {
        if (!workspace?.floorplans?.length) return null;
        const floorplan = workspace.floorplans.find((item) => item.id === workspace.activeFloorplanId) || workspace.floorplans[0];
        workspace.activeFloorplanId = floorplan.id;
        workspace.floorplanName = floorplan.name;
        workspace.referenceImage = floorplan.referenceImage;
        workspace.calibration = floorplan.calibration;
        workspace.structureLayer = floorplan.structureLayer || normalizeStructureLayer(workspace.structureLayer);
        return floorplan;
    }

    function syncWorkspaceMirrorToActiveFloorplan(workspace = state.project?.workspace) {
        if (!workspace) return;
        if (!Array.isArray(workspace.floorplans) || !workspace.floorplans.length) {
            ensureWorkspaceFloorplans(workspace);
        }
        const floorplan = workspace.floorplans.find((item) => item.id === workspace.activeFloorplanId) || workspace.floorplans[0];
        if (!floorplan) return;
        floorplan.name = workspace.floorplanName || floorplan.name;
        floorplan.referenceImage = workspace.referenceImage;
        floorplan.calibration = workspace.calibration;
        floorplan.structureLayer = normalizeStructureLayer(workspace.structureLayer || floorplan.structureLayer);
        floorplan.updatedAt = new Date().toISOString();
    }

    function normalizeFurnitureItem(item, projectId) {
        const category = item.category || 'other';
        const widthMm = measurementToMm(item.widthMm, item.widthCm, 800);
        const depthMm = measurementToMm(item.depthMm, item.depthCm ?? item.heightCm, 400);
        const heightMm = measurementToMm(item.heightMm, null, 0, true);
        return {
            id: item.id || uid('furniture'),
            projectId,
            name: String(item.name || '이름 없는 가구'),
            category,
            categoryLabel: item.categoryLabel || getCategoryLabel(category),
            manufacturer: item.manufacturer || '',
            modelName: item.modelName || '',
            widthMm,
            depthMm,
            heightMm,
            widthCm: mmToCm(widthMm),
            depthCm: mmToCm(depthMm),
            color: item.color || getCategoryColor(category),
            memo: item.memo || '',
            isPreset: Boolean(item.isPreset),
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString()
        };
    }

    function normalizePlacement(item, projectId, workspaceId, catalog, index) {
        if (!item || typeof item !== 'object') return null;
        const catalogItem = catalog.find((furniture) => furniture.id === item.furnitureId);
        const category = item.category || catalogItem?.category || 'other';
        const widthMm = measurementToMm(item.widthMm, item.widthCm, getFurnitureWidthMm(catalogItem) || 800);
        const depthMm = measurementToMm(item.depthMm, item.depthCm ?? item.heightCm, getFurnitureDepthMm(catalogItem) || 400);
        const heightMm = measurementToMm(item.heightMm, null, getFurnitureHeightMm(catalogItem), true);
        const xMm = coordinateToMm(item.xMm, item.xCm, 0);
        const yMm = coordinateToMm(item.yMm, item.yCm, 0);
        return {
            id: item.id || uid('placement'),
            projectId,
            workspaceId,
            furnitureId: item.furnitureId || null,
            name: item.name || catalogItem?.name || '배치 가구',
            category,
            categoryLabel: item.categoryLabel || catalogItem?.categoryLabel || getCategoryLabel(category),
            manufacturer: item.manufacturer || catalogItem?.manufacturer || '',
            modelName: item.modelName || catalogItem?.modelName || '',
            widthMm,
            depthMm,
            heightMm,
            widthCm: mmToCm(widthMm),
            depthCm: mmToCm(depthMm),
            xMm,
            yMm,
            xCm: mmToCm(xMm),
            yCm: mmToCm(yMm),
            rotationDeg: normalizeAngle(item.rotationDeg ?? item.angle ?? 0),
            color: item.color || catalogItem?.color || getCategoryColor(category),
            memo: item.memo || '',
            zIndex: Number.isFinite(Number(item.zIndex)) ? Number(item.zIndex) : index,
            locked: Boolean(item.locked),
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString()
        };
    }

    function normalizeStructureLayer(layer) {
        return {
            rooms: Array.isArray(layer?.rooms) ? layer.rooms.map(normalizeStructureRoom).filter(Boolean) : []
        };
    }

    function normalizeStructureRoom(room) {
        if (!room || typeof room !== 'object') return null;
        const widthMm = measurementToMm(room.widthMm, room.widthCm, 3000);
        const heightMm = measurementToMm(room.heightMm, room.heightCm, 3000);
        const xMm = coordinateToMm(room.xMm, room.xCm, 0);
        const yMm = coordinateToMm(room.yMm, room.yCm, 0);
        return {
            id: room.id || uid('room'),
            name: room.name || '실내 영역',
            xMm,
            yMm,
            widthMm,
            heightMm,
            xCm: mmToCm(xMm),
            yCm: mmToCm(yMm),
            widthCm: mmToCm(widthMm),
            heightCm: mmToCm(heightMm),
            color: room.color || '#64748b',
            memo: room.memo || '',
            createdAt: room.createdAt || new Date().toISOString(),
            updatedAt: room.updatedAt || new Date().toISOString()
        };
    }

    function syncProjectMeasurements(project = state.project) {
        if (!project?.workspace) return project;
        const workspace = project.workspace;
        workspace.widthMm = getWorkspaceWidthMm(workspace);
        workspace.heightMm = getWorkspaceHeightMm(workspace);
        workspace.widthCm = mmToCm(workspace.widthMm);
        workspace.heightCm = mmToCm(workspace.heightMm);
        workspace.unit = 'mm';
        workspace.gridSizeMm = measurementToMm(workspace.gridSizeMm, workspace.gridSizeCm, 500);
        workspace.gridSizeCm = mmToCm(workspace.gridSizeMm);
        workspace.structureLayer = normalizeStructureLayer(workspace.structureLayer);

        ensureWorkspaceFloorplans(workspace).forEach((floorplan) => {
            floorplan.structureLayer = normalizeStructureLayer(floorplan.structureLayer);
        });

        project.furnitureCatalog = (project.furnitureCatalog || []).map((item) => normalizeFurnitureItem(item, project.project.id));
        project.placements = (project.placements || []).map((placement, index) => normalizePlacement(placement, project.project.id, workspace.id, project.furnitureCatalog, index)).filter(Boolean);
        return project;
    }

    function getWorkspaceWidthMm(workspace) {
        return measurementToMm(workspace?.widthMm, workspace?.widthCm, 6000);
    }

    function getWorkspaceHeightMm(workspace) {
        return measurementToMm(workspace?.heightMm, workspace?.heightCm, 4400);
    }

    function getFurnitureWidthMm(item) {
        return measurementToMm(item?.widthMm, item?.widthCm, 800);
    }

    function getFurnitureDepthMm(item) {
        return measurementToMm(item?.depthMm, item?.depthCm ?? item?.heightCm, 400);
    }

    function getFurnitureHeightMm(item) {
        return measurementToMm(item?.heightMm, null, 0, true);
    }

    function getPlacementWidthMm(placement) {
        return measurementToMm(placement?.widthMm, placement?.widthCm, 800);
    }

    function getPlacementDepthMm(placement) {
        return measurementToMm(placement?.depthMm, placement?.depthCm, 400);
    }

    function getPlacementHeightMm(placement) {
        return measurementToMm(placement?.heightMm, null, 0, true);
    }

    function getPlacementXMm(placement) {
        return coordinateToMm(placement?.xMm, placement?.xCm, 0);
    }

    function getPlacementYMm(placement) {
        return coordinateToMm(placement?.yMm, placement?.yCm, 0);
    }

    function getRoomWidthMm(room) {
        return measurementToMm(room?.widthMm, room?.widthCm, 3000);
    }

    function getRoomHeightMm(room) {
        return measurementToMm(room?.heightMm, room?.heightCm, 3000);
    }

    function getRoomXMm(room) {
        return coordinateToMm(room?.xMm, room?.xCm, 0);
    }

    function getRoomYMm(room) {
        return coordinateToMm(room?.yMm, room?.yCm, 0);
    }

    function measurementToMm(mmValue, cmValue, fallbackMm, allowZero = false) {
        const mm = Number(mmValue);
        if (Number.isFinite(mm) && (allowZero ? mm >= 0 : mm > 0)) return mm;
        const cm = Number(cmValue);
        if (Number.isFinite(cm) && (allowZero ? cm >= 0 : cm > 0)) return cmToMm(cm);
        return fallbackMm;
    }

    function coordinateToMm(mmValue, cmValue, fallbackMm) {
        const mm = Number(mmValue);
        if (Number.isFinite(mm)) return mm;
        const cm = Number(cmValue);
        if (Number.isFinite(cm)) return cmToMm(cm);
        return fallbackMm;
    }

    function afterProjectMutation(message, immediate = false) {
        if (!state.project) return;
        touchProject();
        renderProjectPanels();
        setCanvasStatus(message, 'success');
        if (immediate) saveProjectNow();
        else scheduleSave();
    }

    function switchPanelTab(tabName) {
        document.querySelectorAll('[data-panel-tab]').forEach((button) => {
            button.classList.toggle('active', button.dataset.panelTab === tabName);
        });
        dom.inspectorPanel.classList.toggle('active', tabName === 'inspector');
        dom.floorplanPanel.classList.toggle('active', tabName === 'floorplan');
    }

    function openConfirmModal({ title, message, contentHtml, actions }) {
        dom.confirmTitle.textContent = title;
        if (contentHtml) {
            dom.confirmMessage.className = 'modal-rich-content';
            dom.confirmMessage.innerHTML = contentHtml;
        } else {
            dom.confirmMessage.className = 'status-line';
            dom.confirmMessage.textContent = message;
        }
        state.confirmHandlers = [];
        dom.confirmActions.innerHTML = actions.map((action, index) => {
            state.confirmHandlers[index] = action.handler || closeConfirmModal;
            return `<button type="button" class="toolbar-btn ${escapeHtml(action.variant || '')}" data-confirm-index="${index}">${escapeHtml(action.label)}</button>`;
        }).join('');
        dom.confirmActions.querySelectorAll('[data-confirm-index]').forEach((button) => {
            button.addEventListener('click', () => {
                const handler = state.confirmHandlers[Number(button.dataset.confirmIndex)];
                const shouldAutoClose = !button.classList.contains('danger-btn');
                if (shouldAutoClose) closeConfirmModal();
                if (handler) handler();
            });
        });
        dom.confirmModal.classList.add('open');
        dom.confirmModal.setAttribute('aria-hidden', 'false');
    }

    function openInfoModal(title, message, options = {}) {
        openConfirmModal({
            title,
            message: options.html ? '' : message,
            contentHtml: options.html ? message : '',
            actions: [{ label: '확인', variant: 'active-filter' }]
        });
    }

    function openGuideInfo() {
        openInfoModal('이용 안내', `
            <div class="modal-rich-section">
                <h3>Layoutstudio란</h3>
                <p>Layoutstudio SPACE는 도면 이미지를 기준 자료로 삼아 실제 크기의 워크스페이스를 만들고, 가구 보관함의 원본 가구를 도면 위에 배치해 보는 알파 버전 웹 앱입니다.</p>
            </div>
            <div class="modal-rich-section">
                <h3>작업 순서</h3>
                <ol>
                    <li>새 워크스페이스 만들기에서 도면 이미지를 업로드합니다.</li>
                    <li>워크스페이스명과 도면명을 입력하고, 실제 배치 영역의 가로/세로 mm를 확인합니다.</li>
                    <li>도면 기준 영역을 파란 박스로 직접 드래그하거나 여백 수치로 보정합니다.</li>
                    <li>가구 보관함에서 프리셋을 고르거나 직접 추가한 가구를 배치합니다.</li>
                    <li>우측 선택 패널에서 이름, 종류, 크기, X/Y 실측 좌표, 회전, 색상, 메모를 조정합니다.</li>
                </ol>
            </div>
            <div class="modal-rich-section">
                <h3>워크스페이스와 도면</h3>
                <p>워크스페이스는 하나의 저장 단위이자 공간 묶음이고, 도면은 그 안에 들어가는 참조 floorplan입니다. 이번 버전은 하나의 기본 도면 중심으로 동작하지만 저장 구조는 여러 도면을 담을 수 있게 준비되어 있습니다.</p>
            </div>
            <div class="modal-rich-section">
                <h3>실측 단위와 도면 레이어</h3>
                <p>내부 기준 단위는 mm입니다. JSON에는 <strong>xMm, yMm, widthMm, depthMm</strong>이 우선 저장되고, 기존 파일 호환을 위해 cm 필드도 함께 유지됩니다. 줌과 스크롤 팬은 화면 보기만 바꾸며 실측 좌표는 바꾸지 않습니다.</p>
            </div>
            <div class="modal-rich-section">
                <h3>현재 한계</h3>
                <p>도면 구조를 완전히 자동 인식하지 않습니다. OCR 치수 후보는 추천값이며, 사용자가 도면 기준 영역과 실측 크기를 직접 확인해야 합니다.</p>
            </div>
            <div class="modal-rich-section">
                <h3>저장</h3>
                <p>기본 저장은 브라우저 LocalStorage 자동 저장입니다. 다른 브라우저나 장치로 옮길 때는 JSON 내보내기 후 워크스페이스 파일 가져오기를 사용하세요.</p>
            </div>
        `, { html: true });
    }

    function openPrivacyInfo() {
        openInfoModal('개인정보처리방침', `
            <div class="modal-rich-section">
                <h3>서비스와 버전</h3>
                <p>서비스명은 Layoutstudio SPACE이며, 현재 ${APP_VERSION}는 개인 작업용 알파 버전입니다. 운영 서버 데이터베이스 없이 브라우저 LocalStorage와 사용자가 직접 내보내는 JSON 파일 중심으로 동작합니다.</p>
            </div>
            <div class="modal-rich-section">
                <h3>저장될 수 있는 정보</h3>
                <p>워크스페이스명, 도면명, 도면 이미지 데이터, 도면 기준 영역, 실측 크기, 가구 보관함, 배치 좌표와 회전값, 색상, 메모, 로컬 계정 식별 정보가 브라우저에 저장될 수 있습니다.</p>
            </div>
            <div class="modal-rich-section">
                <h3>저장 위치와 삭제</h3>
                <p>정보는 현재 브라우저 LocalStorage와 사용자가 저장한 JSON 파일에 있습니다. 앱의 워크스페이스 삭제 버튼으로 로컬 저장 항목을 지우거나, 브라우저 사이트 데이터를 삭제할 수 있습니다. 브라우저 데이터를 삭제하면 저장된 워크스페이스도 사라질 수 있습니다.</p>
            </div>
            <div class="modal-rich-section">
                <h3>제3자 제공</h3>
                <p>현재 앱은 워크스페이스 데이터를 별도 서버로 전송하거나 제3자에게 제공하지 않습니다. 다만 CDN으로 불러오는 Fabric.js, Tesseract.js, Lucide, 웹폰트 요청은 각 CDN 제공자의 접속 로그 정책을 따를 수 있습니다.</p>
            </div>
            <div class="modal-rich-section">
                <h3>향후 변경</h3>
                <p>실제 계정, 데이터베이스, 이미지 저장소가 도입되면 저장 위치, 보관 기간, 접근 권한 정책을 갱신해야 합니다. 중요한 작업은 JSON 내보내기로 별도 백업하세요.</p>
            </div>
        `, { html: true });
    }

    function openLicenseInfo() {
        openInfoModal('오픈소스 라이선스', `
            <div class="modal-rich-section">
                <h3>앱에서 사용하는 주요 라이브러리</h3>
                <div class="license-grid">
                    ${RUNTIME_LIBRARIES.map((library) => `
                        <article>
                            <strong>${escapeHtml(library.name)}</strong>
                            <span>${escapeHtml(library.purpose)}</span>
                            <span>${escapeHtml(library.summary)}</span>
                            <em>${escapeHtml(library.license)} License</em>
                        </article>
                    `).join('')}
                </div>
            </div>
            <div class="modal-rich-section">
                <h3>레퍼런스 사용 원칙</h3>
                <p>레퍼런스 코드베이스는 레이어 분리, 뷰포트/줌 처리, 카탈로그/오브젝트 액션 구조를 참고해 Layoutstudio 코드에 맞게 재구현했습니다. 직접 복사한 레퍼런스 코드는 없으며, GPL 계열 또는 라이선스가 불명확한 코드는 포함하지 않았습니다.</p>
            </div>
        `, { html: true });
    }

    function openCreatorInfo() {
        openInfoModal('제작자 정보', `
            <div class="modal-rich-section">
                <h3>ONE STUDIO · 용석희</h3>
                <p>
                    Layoutstudio는 ONE STUDIO 패밀리 서비스로 기획된 개인 프로젝트입니다.
                    도면 이미지를 기준으로 실측 워크스페이스를 만들고, 가구 배치를 자유롭게 검토할 수 있도록 제작되었습니다.
                </p>
            </div>

            <div class="modal-rich-section">
                <h3>기획 및 제작</h3>
                <p>
                    <strong>용석희 / YONG Seokhee</strong><br>
                    연세대학교 미래캠퍼스 소프트웨어학부 24학번<br>
                    YONSEI University MIRAE CAMPUS SW '24
                </p>
            </div>

            <div class="modal-rich-section">
                <h3>개발 보조</h3>
                <p>
                    개발 과정에는 OpenAI ChatGPT와 Codex를 보조 도구로 활용했습니다.
                    오픈소스 프로젝트는 구조와 구현 패턴을 참고하되, Layoutstudio의 목적과 데이터 구조에 맞게 재구성했습니다.
                </p>
            </div>

            <div class="modal-rich-section">
                <h3>문의</h3>
                <p>
                    ONE STUDIO: <strong>yong6330@onestudio.kr</strong><br>
                    YONSEI: <strong>yong6330@yonsei.ac.kr</strong>
                </p>
            </div>

            <div class="modal-rich-section">
                <h3>버전</h3>
                <p>
                    Layoutstudio SPACE · Version ${APP_VERSION}<br>
                    Copyright 2026 ONESTUDIO. All rights reserved.
                </p>
            </div>
        `, { html: true });
    }

    function openSystemSettings() {
        const actions = [
            { label: '이용 안내', handler: openGuideInfo },
            { label: '개인정보처리방침', handler: openPrivacyInfo },
            { label: '오픈소스 라이선스', handler: openLicenseInfo }
        ];
        if (state.project) {
            actions.unshift({ label: 'JSON 내보내기', variant: 'active-filter', handler: exportProjectJson });
        }
        actions.push({ label: '닫기' });
        openConfirmModal({
            title: '시스템 설정',
            message: `Version ${APP_VERSION} · 저장 방식: 브라우저 LocalStorage 자동 저장 + 워크스페이스 파일 가져오기/내보내기`,
            actions
        });
    }

    function closeConfirmModal() {
        dom.confirmModal.classList.remove('open');
        dom.confirmModal.setAttribute('aria-hidden', 'true');
        state.confirmHandlers = [];
    }

    function getStructureRooms() {
        const floorplan = getActiveFloorplan();
        const layer = floorplan?.structureLayer || state.project?.workspace?.structureLayer || normalizeStructureLayer();
        layer.rooms = Array.isArray(layer.rooms) ? layer.rooms : [];
        if (floorplan) {
            floorplan.structureLayer = layer;
            state.project.workspace.structureLayer = layer;
        }
        return layer.rooms;
    }

    function getStructureRoom(id) {
        return getStructureRooms().find((room) => room.id === id) || null;
    }

    function getSelectedRoom() {
        return state.selectedStructureId ? getStructureRoom(state.selectedStructureId) : null;
    }

    function addStructureRoom() {
        if (!state.project) return;
        const widthMm = Math.min(3000, getWorkspaceWidthMm(state.project.workspace));
        const heightMm = Math.min(3000, getWorkspaceHeightMm(state.project.workspace));
        const room = normalizeStructureRoom({
            id: uid('room'),
            name: `실내 영역 ${getStructureRooms().length + 1}`,
            xMm: 0,
            yMm: 0,
            widthMm,
            heightMm,
            color: '#64748b'
        });
        getStructureRooms().push(room);
        state.selectedStructureId = room.id;
        state.selectedPlacementId = null;
        afterProjectMutation('방/영역 사각형을 추가했습니다.');
    }

    function renderRoomInspector(room) {
        dom.inspectorPanel.innerHTML = `
            <div class="inspector-card">
                <div class="selection-title">
                    <span class="furniture-swatch neutral-swatch"></span>
                    <div>
                        <h3>${escapeHtml(room.name)}</h3>
                        <p>Structure Layer · ${formatMm(getRoomWidthMm(room))} x ${formatMm(getRoomHeightMm(room))}</p>
                    </div>
                </div>
                <div class="inspector-grid">
                    <label class="form-field full">
                        <span>방/영역 이름</span>
                        <input data-room-field="name" type="text" value="${escapeHtml(room.name)}">
                    </label>
                    <label class="form-field">
                        <span>가로(mm)</span>
                        <input data-room-field="widthMm" type="number" min="1" step="1" value="${round(getRoomWidthMm(room), 0)}">
                    </label>
                    <label class="form-field">
                        <span>세로(mm)</span>
                        <input data-room-field="heightMm" type="number" min="1" step="1" value="${round(getRoomHeightMm(room), 0)}">
                    </label>
                    <label class="form-field">
                        <span>X 위치(mm)</span>
                        <input data-room-field="xMm" type="number" step="1" value="${round(getRoomXMm(room), 0)}">
                    </label>
                    <label class="form-field">
                        <span>Y 위치(mm)</span>
                        <input data-room-field="yMm" type="number" step="1" value="${round(getRoomYMm(room), 0)}">
                    </label>
                    <label class="form-field full">
                        <span>메모</span>
                        <textarea data-room-field="memo">${escapeHtml(room.memo || '')}</textarea>
                    </label>
                </div>
                <div class="inspector-actions">
                    <button type="button" class="toolbar-btn danger-btn" data-room-action="delete"><i data-lucide="trash-2" aria-hidden="true"></i><span>영역 삭제</span></button>
                </div>
            </div>
        `;
        refreshIcons();
    }

    function handleRoomInspectorInput(event, field) {
        const room = getSelectedRoom();
        if (!room) return;
        if (field === 'name' || field === 'memo') {
            room[field] = event.target.value;
        } else if (field === 'xMm' || field === 'yMm') {
            room[field] = numberOr(event.target.value, room[field]);
            room[field.replace('Mm', 'Cm')] = mmToCm(room[field]);
        } else if (field === 'widthMm' || field === 'heightMm') {
            room[field] = positiveNumber(event.target.value, room[field]);
            room[field.replace('Mm', 'Cm')] = mmToCm(room[field]);
        }
        room.updatedAt = new Date().toISOString();
        scheduleSave();
        renderWorkspace();
        renderFloorplanPanel();
    }

    function handleRoomInspectorAction(action) {
        if (action !== 'delete') return;
        const room = getSelectedRoom();
        if (!room) return;
        const rooms = getStructureRooms();
        const index = rooms.findIndex((item) => item.id === room.id);
        if (index >= 0) rooms.splice(index, 1);
        state.selectedStructureId = null;
        afterProjectMutation('방/영역 사각형을 삭제했습니다.');
    }

    function getSelectedPlacement() {
        return state.selectedPlacementId ? getPlacement(state.selectedPlacementId) : null;
    }

    function getPlacement(id) {
        return state.project?.placements.find((placement) => placement.id === id) || null;
    }

    function getFurniture(id) {
        return state.project?.furnitureCatalog.find((item) => item.id === id) || null;
    }

    function getFloorplanName(project = state.project) {
        if (project?.workspace) ensureWorkspaceFloorplans(project.workspace);
        return project?.workspace?.floorplanName
            || project?.workspace?.referenceImage?.name
            || project?.workspace?.referenceImage?.sourceFileName
            || '기본 도면';
    }

    function getNextZIndex() {
        return Math.max(0, ...state.project.placements.map((placement) => Number(placement.zIndex) || 0)) + 1;
    }

    function getLowestZIndex() {
        return Math.min(0, ...state.project.placements.map((placement) => Number(placement.zIndex) || 0));
    }

    function getWorkspaceView(workspace = state.project?.workspace) {
        if (!workspace) return { zoom: 1, panX: 0, panY: 0 };
        workspace.view = normalizeWorkspaceView(workspace.view, workspace.zoom);
        workspace.zoom = workspace.view.zoom;
        return workspace.view;
    }

    function setWorkspaceZoom(workspace, zoom) {
        const view = getWorkspaceView(workspace);
        view.zoom = clamp(numberOr(zoom, view.zoom), 0.35, 3);
        workspace.zoom = view.zoom;
    }

    function calculateWorkspaceView(workspace) {
        const view = getWorkspaceView(workspace);
        const availableWidth = Math.max(360, dom.canvasDropzone.clientWidth - 32 || 900);
        const workspaceWidthMm = getWorkspaceWidthMm(workspace);
        const workspaceHeightMm = getWorkspaceHeightMm(workspace);
        const baseScale = availableWidth / workspaceWidthMm;
        const mmToPx = clamp(baseScale * view.zoom, 0.004, 0.8);
        return {
            mmToPx,
            canvasWidth: Math.max(320, Math.round(workspaceWidthMm * mmToPx)),
            canvasHeight: Math.max(220, Math.round(workspaceHeightMm * mmToPx))
        };
    }

    function mmToCanvas(valueMm) {
        return valueMm * state.mmToPx;
    }

    function cmToCanvas(valueCm) {
        return mmToCanvas(cmToMm(valueCm));
    }

    function canvasPointToMm(xPx, yPx) {
        const safeScale = state.mmToPx || 1;
        return {
            xMm: xPx / safeScale,
            yMm: yPx / safeScale
        };
    }

    function canvasPointToCm(xPx, yPx) {
        const safeScale = state.cmToPx || MM_PER_CM;
        return {
            xCm: xPx / safeScale,
            yCm: yPx / safeScale
        };
    }

    function captureWorkspacePan() {
        if (!state.project || state.restoringPan) return;
        const view = getWorkspaceView(state.project.workspace);
        view.panX = Math.max(0, dom.canvasDropzone.scrollLeft);
        view.panY = Math.max(0, dom.canvasDropzone.scrollTop);
        scheduleSave(900);
    }

    function restoreWorkspacePan() {
        if (!state.project) return;
        const view = getWorkspaceView(state.project.workspace);
        state.restoringPan = true;
        window.requestAnimationFrame(() => {
            dom.canvasDropzone.scrollLeft = view.panX || 0;
            dom.canvasDropzone.scrollTop = view.panY || 0;
            window.setTimeout(() => {
                state.restoringPan = false;
            }, 0);
        });
    }

    function getCategoryLabel(category) {
        return CATEGORY_LABELS[category] || category || CATEGORY_LABELS.other;
    }

    function getCategoryColor(category) {
        return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
    }

    function isPlacementOutOfBounds(placement) {
        const workspace = state.project.workspace;
        return getPlacementXMm(placement) < 0
            || getPlacementYMm(placement) < 0
            || getPlacementXMm(placement) + getPlacementWidthMm(placement) > getWorkspaceWidthMm(workspace)
            || getPlacementYMm(placement) + getPlacementDepthMm(placement) > getWorkspaceHeightMm(workspace);
    }

    function isTypingTarget(target) {
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
    }

    function isModalOpen() {
        return Boolean(document.querySelector('.modal-backdrop.open'));
    }

    function setStartStatus(message, type = '') {
        dom.accountSummaryText.textContent = message;
        dom.accountSummaryText.className = `status-line ${type === 'error' ? 'is-error' : type === 'success' ? 'is-success' : ''}`;
    }

    function setCanvasStatus(message, type = '') {
        dom.canvasStatus.textContent = message;
        dom.canvasStatus.className = `canvas-status ${type === 'error' ? 'is-error' : type === 'success' ? 'is-success' : ''}`;
    }

    function metricChip(value, label) {
        return `<span class="metric-chip"><strong>${escapeHtml(value)}</strong>&nbsp;${escapeHtml(label)}</span>`;
    }

    function emptyState(message) {
        return `<div class="empty-state">${escapeHtml(message)}</div>`;
    }

    function parseDimensions(text) {
        const source = String(text || '').replace(/\s+/g, ' ');
        const dimensions = [];
        const unitPattern = /(\d+(?:[.,]\d+)?)\s*(mm|millimeters?|밀리미터|밀리|cm|centimeters?|센티미터|센티|m|meters?|미터)\b/gi;
        const pairPattern = /(\d{2,5})\s*(?:x|×|X)\s*(\d{2,5})\s*(mm|cm|m)?/g;
        let match;

        while ((match = unitPattern.exec(source))) {
            const value = parseMeasurementNumber(match[1]);
            const mm = unitToMm(value, match[2].toLowerCase());
            if (mm) dimensions.push({ raw: match[0], mm: round(mm, 0), cm: round(mmToCm(mm), 1) });
        }

        while ((match = pairPattern.exec(source))) {
            const unit = (match[3] || 'mm').toLowerCase();
            [match[1], match[2]].forEach((valueText) => {
                const mm = unitToMm(parseMeasurementNumber(valueText), unit);
                if (mm) dimensions.push({ raw: `${valueText}${unit}`, mm: round(mm, 0), cm: round(mmToCm(mm), 1) });
            });
        }

        const seen = new Set();
        return dimensions
            .filter((dimension) => dimension.mm >= 200 && dimension.mm <= 100000)
            .filter((dimension) => {
                const key = `${Math.round(dimension.mm)}-${dimension.raw.toLowerCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => b.mm - a.mm);
    }

    function parseMeasurementNumber(value) {
        const text = String(value || '').trim();
        if (/^\d{1,3}(,\d{3})+$/.test(text)) return Number(text.replace(/,/g, ''));
        return Number(text.replace(',', '.'));
    }

    function unitToCm(value, unit) {
        return mmToCm(unitToMm(value, unit));
    }

    function unitToMm(value, unit) {
        const number = Number(value);
        if (!Number.isFinite(number) || number <= 0) return 0;
        if (unit.startsWith('mm') || unit.includes('밀리')) return number;
        if (unit.startsWith('cm') || unit.includes('센티')) return number * MM_PER_CM;
        if (unit === 'm' || unit.startsWith('meter') || unit.includes('미터')) return number * MM_PER_METER;
        return number;
    }

    function cmToMm(value) {
        return Number(value) * MM_PER_CM;
    }

    function mmToCm(value) {
        return Number(value || 0) / MM_PER_CM;
    }

    function cropToEdges(crop, imageSize) {
        return {
            left: crop.x,
            top: crop.y,
            right: imageSize.width - crop.x - crop.width,
            bottom: imageSize.height - crop.y - crop.height
        };
    }

    function edgesToCrop(edges, imageSize) {
        return {
            x: edges.left,
            y: edges.top,
            width: imageSize.width - edges.left - edges.right,
            height: imageSize.height - edges.top - edges.bottom
        };
    }

    function createEmptyWizardFurnitureDraft(included = true) {
        return {
            id: uid('wizard-furniture'),
            included,
            name: '',
            category: 'desk',
            categoryLabel: getCategoryLabel('desk'),
            manufacturer: '',
            modelName: '',
            widthMm: 0,
            depthMm: 0,
            heightMm: 0,
            color: getCategoryColor('desk'),
            memo: '',
            isPreset: false
        };
    }

    function createWizardPresetDrafts() {
        return DEFAULT_FURNITURE_PRESETS.map((preset) => ({
            id: uid('wizard-furniture'),
            included: true,
            name: preset.name,
            category: preset.category,
            categoryLabel: getCategoryLabel(preset.category),
            manufacturer: preset.manufacturer || '',
            modelName: preset.modelName || '',
            widthMm: preset.widthMm,
            depthMm: preset.depthMm,
            heightMm: preset.heightMm || 0,
            color: preset.color,
            memo: preset.memo || '',
            isPreset: true
        }));
    }

    function normalizeWizardFurnitureDraft(draft) {
        const category = draft.category || 'other';
        return {
            name: String(draft.name || '').trim(),
            category,
            categoryLabel: draft.categoryLabel || getCategoryLabel(category),
            manufacturer: String(draft.manufacturer || '').trim(),
            modelName: String(draft.modelName || '').trim(),
            widthMm: positiveNumber(draft.widthMm, 0),
            depthMm: positiveNumber(draft.depthMm, 0),
            heightMm: Math.max(0, numberOr(draft.heightMm, 0)),
            color: draft.color || getCategoryColor(category),
            memo: String(draft.memo || '').trim(),
            isPreset: Boolean(draft.isPreset)
        };
    }

    function createFurnitureFromWizardDrafts(projectId) {
        const now = new Date().toISOString();
        return state.wizard.furnitureDrafts
            .filter((draft) => draft.included)
            .map(normalizeWizardFurnitureDraft)
            .filter((draft) => draft.name && draft.widthMm > 0 && draft.depthMm > 0)
            .map((draft) => ({
                ...draft,
                id: uid('furniture'),
                projectId,
                widthCm: mmToCm(draft.widthMm),
                depthCm: mmToCm(draft.depthMm),
                createdAt: now,
                updatedAt: now
            }));
    }

    function renderCategoryOptions(selectedCategory = 'other') {
        return Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            `<option value="${escapeHtml(value)}" ${selectedCategory === value ? 'selected' : ''}>${escapeHtml(label)}</option>`
        )).join('');
    }

    function normalizeCrop(crop, imageSize) {
        const width = positiveNumber(imageSize?.width, 1);
        const height = positiveNumber(imageSize?.height, 1);
        const normalized = {
            x: clamp(numberOr(crop?.x, 0), 0, width - 1),
            y: clamp(numberOr(crop?.y, 0), 0, height - 1),
            width: clamp(positiveNumber(crop?.width, width), 1, width),
            height: clamp(positiveNumber(crop?.height, height), 1, height)
        };
        if (normalized.x + normalized.width > width) normalized.width = width - normalized.x;
        if (normalized.y + normalized.height > height) normalized.height = height - normalized.y;
        return normalized;
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('파일을 읽지 못했습니다.'));
            reader.readAsDataURL(file);
        });
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('파일을 읽지 못했습니다.'));
            reader.readAsText(file);
        });
    }

    function getImageSize(dataUrl) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
            image.onerror = () => reject(new Error('이미지 크기를 확인하지 못했습니다.'));
            image.src = dataUrl;
        });
    }

    function waitForGlobal(name, timeoutMs) {
        if (window[name]) return Promise.resolve(window[name]);
        return new Promise((resolve) => {
            const startedAt = Date.now();
            const timer = window.setInterval(() => {
                if (window[name]) {
                    window.clearInterval(timer);
                    resolve(window[name]);
                }
                if (Date.now() - startedAt >= timeoutMs) {
                    window.clearInterval(timer);
                    resolve(null);
                }
            }, 120);
        });
    }

    function positiveNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    }

    function numberOr(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function normalizeAngle(value) {
        const angle = numberOr(value, 0) % 360;
        return angle < 0 ? angle + 360 : angle;
    }

    function round(value, precision = 0) {
        const factor = 10 ** precision;
        return Math.round(numberOr(value, 0) * factor) / factor;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function formatCm(value) {
        return `${round(value, 1)}cm`;
    }

    function formatMm(value) {
        const mm = round(value, 0);
        if (mm >= 1000 && mm % 100 === 0) return `${mm}mm (${round(mm / 1000, 2)}m)`;
        return `${mm}mm`;
    }

    function formatGridLabel(valueMm) {
        return valueMm >= 1000 ? `${round(valueMm / 1000, 1)}m` : `${round(valueMm, 0)}mm`;
    }

    function formatDate(value) {
        if (!value) return '-';
        return new Date(value).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function hexToRgba(hex, alpha) {
        const normalized = String(hex || '#64748b').replace('#', '');
        const value = normalized.length === 3
            ? normalized.split('').map((char) => char + char).join('')
            : normalized.padEnd(6, '0').slice(0, 6);
        const intValue = Number.parseInt(value, 16);
        const red = (intValue >> 16) & 255;
        const green = (intValue >> 8) & 255;
        const blue = intValue & 255;
        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    function uid(prefix) {
        if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function slugify(value) {
        const slug = String(value || 'layoutstudio-project')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return slug || 'layoutstudio-project';
    }

    function escapeHtml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function debounce(callback, delay) {
        let timer = null;
        return (...args) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => callback(...args), delay);
        };
    }

    function $(selector) {
        return document.querySelector(selector);
    }

    function refreshIcons() {
        if (window.lucide) window.lucide.createIcons();
    }
})();
