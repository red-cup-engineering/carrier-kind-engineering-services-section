;;; init.el --- GnoponEmacs, a composable Emacs baseline -*- lexical-binding: t; -*-
;;
;; Goals:
;; - Single-file, portable init.el (no auxiliary config files required)
;; - straight.el + use-package
;; - Terminal-first, keyboard-only, quiet UI
;; - Coherent subsystems (completion, discovery, projects/diagnostics)
;; - Small composable packages, built-in-first where it matters
;;
;;; Code:

;;;; Version guard
(when (version< emacs-version "28.1")
  (error "This init.el targets Emacs 28.1+ (got %s)" emacs-version))

;;;; Package management: straight.el + use-package
(setq package-enable-at-startup nil)

;; Shallow clones keep initial bootstrap fast; set to nil if you routinely hack
;; on packages and want full history.
(setq straight-vc-git-default-clone-depth 1)

(defvar bootstrap-version)
(let ((bootstrap-file
       (expand-file-name "straight/repos/straight.el/bootstrap.el"
                         user-emacs-directory))
      (bootstrap-version 7))
  (unless (file-exists-p bootstrap-file)
    (with-current-buffer
        (url-retrieve-synchronously
         "https://raw.githubusercontent.com/radian-software/straight.el/develop/install.el"
         'silent 'inhibit-cookies)
      (goto-char (point-max))
      (eval-print-last-sexp)))
  (load bootstrap-file nil 'nomessage))

(straight-use-package 'use-package)
(setq straight-use-package-by-default t)

;; Keep Customize from writing into this file (or creating a separate one).
(setq custom-file null-device)

;;;; Domain keymaps (C-c <letter> …)
;; Emacs convention: C-c <letter> is reserved for users.
(defvar gpe/file-map   (make-sparse-keymap) "File-related commands.")
(defvar gpe/buffer-map (make-sparse-keymap) "Buffer-related commands.")
(defvar gpe/search-map (make-sparse-keymap) "Search/navigation commands.")
(defvar gpe/project-map (make-sparse-keymap) "Project-related commands.")
(defvar gpe/vc-map     (make-sparse-keymap) "Version-control commands.")
(defvar gpe/diag-map   (make-sparse-keymap) "Diagnostics commands.")
(defvar gpe/toggle-map (make-sparse-keymap) "Toggles.")
(defvar gpe/help-map   (make-sparse-keymap) "Help/introspection commands.")

(define-key global-map (kbd "C-c f") gpe/file-map)
(define-key global-map (kbd "C-c b") gpe/buffer-map)
(define-key global-map (kbd "C-c s") gpe/search-map)
(define-key global-map (kbd "C-c p") gpe/project-map)
(define-key global-map (kbd "C-c g") gpe/vc-map)
(define-key global-map (kbd "C-c d") gpe/diag-map)
(define-key global-map (kbd "C-c t") gpe/toggle-map)
(define-key global-map (kbd "C-c h") gpe/help-map)

;;;; Core Emacs behavior (built-in)
(use-package emacs
  :straight nil
  :init
  ;; Startup / noise
  (setq inhibit-startup-message t
        inhibit-startup-screen t
        initial-scratch-message nil
        ring-bell-function #'ignore
        visible-bell nil
        use-dialog-box nil)

  ;; Prefer short answers (Emacs 28+), fall back gracefully.
  (if (boundp 'use-short-answers)
      (setq use-short-answers t)
    (fset 'yes-or-no-p #'y-or-n-p))

  ;; Backups and autosaves: keep working trees clean.
  (let* ((backup-dir (expand-file-name "var/backups/" user-emacs-directory))
         (autosave-dir (expand-file-name "var/autosaves/" user-emacs-directory)))
    (make-directory backup-dir t)
    (make-directory autosave-dir t)
    (setq backup-directory-alist `(("." . ,backup-dir))
          auto-save-file-name-transforms `((".*" ,autosave-dir t))
          create-lockfiles nil))

  ;; Quiet UI; terminal-friendly.
  (when (fboundp 'menu-bar-mode)   (menu-bar-mode -1))
  (when (fboundp 'tool-bar-mode)   (tool-bar-mode -1))
  (when (fboundp 'scroll-bar-mode) (scroll-bar-mode -1))
  (blink-cursor-mode -1)
  (column-number-mode 1)
  (setq frame-title-format '("GnoponEmacs — " (:eval (buffer-name))))

  ;; Editing behavior: “aggressive but not magical”.
  (electric-pair-mode 1)
  (electric-indent-mode 1)
  (delete-selection-mode 1)
  (show-paren-mode 1)

  ;; “Modern default” indentation and completion ergonomics.
  (setq-default indent-tabs-mode nil
                tab-width 4
                fill-column 80)
  (setq sentence-end-double-space nil
        require-final-newline t
        ;; TAB indents, and when it can't, it completes.
        tab-always-indent 'complete
        ;; Small quality-of-life for completion cycling where applicable.
        completion-cycle-threshold 3
        ;; Case-insensitive matching is usually less friction.
        read-file-name-completion-ignore-case t
        read-buffer-completion-ignore-case t
        completion-ignore-case t)

  ;; State
  (savehist-mode 1)
  (recentf-mode 1)
  (setq history-length 1000
        recentf-max-saved-items 200
        recentf-auto-cleanup 'never)

  (global-auto-revert-mode 1)
  (setq global-auto-revert-non-file-buffers t)

  ;; Minibuffer: show nested prompts; allow recursion.
  (minibuffer-depth-indicate-mode 1)
  (setq enable-recursive-minibuffers t)

  ;; Windows
  (winner-mode 1)

  ;; Scrolling: keep point stable.
  (setq scroll-conservatively 101
        scroll-margin 3)

  ;; Hooks: keep line numbers out of text buffers by default.
  (add-hook 'prog-mode-hook #'display-line-numbers-mode)
  (add-hook 'prog-mode-hook (lambda () (setq-local show-trailing-whitespace t)))

  :bind
  (:map gpe/file-map
        ("f" . find-file)
        ("F" . find-file-other-window)
        ("d" . dired)
        ("s" . save-buffer))
  (:map gpe/buffer-map
        ("b" . switch-to-buffer)
        ("k" . kill-current-buffer)
        ("n" . next-buffer)
        ("p" . previous-buffer)
        ("r" . revert-buffer))
  (:map gpe/toggle-map
        ("n" . display-line-numbers-mode)
        ("t" . toggle-truncate-lines)
        ("o" . olivetti-mode)
        ("v" . visual-fill-column-mode)
        ("V" . gpe/vterm-toggle))
  (:map gpe/help-map
        ("k" . describe-key)
        ("f" . describe-function)
        ("v" . describe-variable)
        ("m" . describe-mode)
        ("b" . describe-bindings)))

;;;; Modeline (minimal)
(use-package mood-line
  :init
  (mood-line-mode 1))

;;;; Theme: Modus (built-in, semantic, light/dark toggling)
(use-package modus-themes
  :straight nil
  :init
  (setq modus-themes-to-toggle '(modus-operandi modus-vivendi)
        modus-themes-bold-constructs t
        modus-themes-italic-constructs t
        modus-themes-mixed-fonts nil
        modus-themes-variable-pitch-ui nil)
  (load-theme 'modus-operandi t)
  :bind
  (:map gpe/toggle-map
        ("T" . modus-themes-toggle)))

;;;; Completion (minibuffer): Vertico + Orderless + Marginalia + Consult + Embark
(use-package vertico
  :init
  (setq vertico-cycle t
        vertico-resize t
        vertico-count 12)
  (vertico-mode 1)
  :bind (:map vertico-map
              ;; Familiar “TAB completion” is still available via M-TAB.
              ("M-TAB" . minibuffer-complete)
              ("M-RET" . minibuffer-force-complete-and-exit)
              ("?" . minibuffer-completion-help)))

(use-package vertico-directory
  :straight nil
  :after vertico
  :config
  (require 'vertico-directory)
  :bind (:map vertico-map
              ("RET" . vertico-directory-enter)
              ("DEL" . vertico-directory-delete-char)
              ("M-DEL" . vertico-directory-delete-word))
  :hook (rfn-eshadow-update-overlay . vertico-directory-tidy))

(use-package orderless
  :init
  ;; Orderless + basic is a common “safe” baseline (basic keeps dynamic tables happy).
  (setq completion-styles '(orderless basic)
        completion-category-defaults nil
        completion-category-overrides '((file (styles basic partial-completion)))))

(use-package marginalia
  :init
  (marginalia-mode 1))

(use-package consult
  :init
  ;; Make a few core subsystems use consult UIs (still built on completing-read).
  (setq xref-show-xrefs-function #'consult-xref
        xref-show-definitions-function #'consult-xref)

  ;; Small helper: search from project root when available.
  (defun gpe/consult-ripgrep-project ()
    "Search the current project with ripgrep (fallback: current directory)."
    (interactive)
    (let ((default-directory
           (or (when-let ((pr (project-current nil)))
                 (project-root pr))
               default-directory)))
      (consult-ripgrep default-directory)))

  :bind
  (("C-x b" . consult-buffer)
   ("M-y" . consult-yank-pop)
   :map gpe/file-map
   ("r" . consult-recent-file)
   :map gpe/search-map
   ("l" . consult-line)
   ("i" . consult-imenu)
   ("g" . consult-grep)
   ("G" . consult-git-grep)
   ("r" . consult-ripgrep)
   :map gpe/project-map
   ("s" . gpe/consult-ripgrep-project)
   :map gpe/diag-map
   ("l" . consult-flymake)))

(use-package embark
  :bind (("C-." . embark-act)
         ("C-;" . embark-dwim)
         ("C-h B" . embark-bindings))
  :init
  ;; Use Embark’s completing-read interface for prefix help.
  (setq prefix-help-command #'embark-prefix-help-command))

(use-package embark-consult
  :after (embark consult)
  :hook (embark-collect-mode . consult-preview-at-point-mode))

(use-package wgrep
  :commands wgrep-change-to-wgrep-mode)

;;;; Completion (in-buffer): Corfu + Cape (terminal support via corfu-terminal)
(use-package corfu
  :init
  ;; Keep minibuffer completion distinct (Vertico already owns it).
  ;; Corfu auto-completion is deliberately off: explicit completion is safer
  ;; and less surprising in a baseline config.
  (setq corfu-auto nil
        corfu-cycle t
        corfu-preselect 'prompt
        corfu-quit-no-match t)
  (global-corfu-mode 1))

(use-package corfu-terminal
  :after corfu
  :if (not (display-graphic-p))
  :config
  (corfu-terminal-mode 1))

(use-package cape
  :init
  ;; Add a couple of generic CAPFs buffer-locally, appended after mode CAPFs.
  (defun gpe/cape-setup ()
    (add-hook 'completion-at-point-functions #'cape-file t t)
    (add-hook 'completion-at-point-functions #'cape-dabbrev t t))
  (add-hook 'prog-mode-hook #'gpe/cape-setup)
  (add-hook 'text-mode-hook #'gpe/cape-setup))

;;;; Discoverability: which-key
(use-package which-key
  :init
  (setq which-key-idle-delay 0.6
        which-key-idle-secondary-delay 0.05
        which-key-max-description-length 32)
  (which-key-mode 1)
  :config
  (which-key-add-key-based-replacements
    "C-c f" "files"
    "C-c b" "buffers"
    "C-c s" "search"
    "C-c p" "project"
    "C-c g" "vc/git"
    "C-c d" "diagnostics"
    "C-c t" "toggles"
    "C-c h" "help"))

;;;; Text editing (Markdown + prose)
(use-package visual-fill-column
  :init
  (setq visual-fill-column-width fill-column
        visual-fill-column-center-text t))

(use-package olivetti
  :init
  (setq olivetti-body-width fill-column))

(use-package mixed-pitch
  :init
  (setq mixed-pitch-set-height t
        mixed-pitch-face 'variable-pitch))

(use-package whitespace
  :straight nil
  :init
  (setq whitespace-style '(face trailing tabs tab-mark)))

(use-package markdown-mode
  :mode (("\\.md\\'" . markdown-mode)
         ("\\.markdown\\'" . markdown-mode))
  :hook (markdown-mode . outline-minor-mode)
  :init
  (setq markdown-fontify-code-blocks-natively t))

(use-package edit-indirect
  :commands edit-indirect-region)

(use-package yaml-mode
  :mode ("\\.ya?ml\\'" . yaml-mode))

(use-package toml-mode
  :mode ("\\.toml\\'" . toml-mode))

(use-package json-mode
  :mode ("\\.json\\'" . json-mode))

(defface gpe/markdown-frontmatter-face
  '((t :inherit shadow))
  "Face for Markdown frontmatter blocks."
  :group 'gnoponemacs)

(defun gpe/markdown-frontmatter-setup ()
  "Highlight YAML frontmatter in Markdown."
  (font-lock-add-keywords
   nil
   '(("\\`\\(---\\(?:.\\|\n\\)*?\\)\\(^---\\)$"
      (1 'gpe/markdown-frontmatter-face t)
      (2 'gpe/markdown-frontmatter-face t)))))

(defun gpe/markdown-heading-sizes ()
  "Subtle heading scaling for Markdown in GUI."
  (when (display-graphic-p)
    (dolist (spec '((markdown-header-face-1 . 1.25)
                    (markdown-header-face-2 . 1.18)
                    (markdown-header-face-3 . 1.12)
                    (markdown-header-face-4 . 1.06)))
      (when (facep (car spec))
        (set-face-attribute (car spec) nil :height (cdr spec))))))

(defun gpe/prose-visual-setup ()
  "Make prose vs. code visually distinct in text buffers."
  (hl-line-mode 1)
  (when (derived-mode-p 'markdown-mode)
    (when (facep 'markdown-code-face)
      (face-remap-add-relative 'markdown-code-face :inherit 'fixed-pitch))
    (when (facep 'markdown-inline-code-face)
      (face-remap-add-relative 'markdown-inline-code-face :inherit 'fixed-pitch))
    (when (facep 'markdown-pre-face)
      (face-remap-add-relative 'markdown-pre-face :inherit 'fixed-pitch))
    (when (facep 'markdown-metadata-face)
      (face-remap-add-relative 'markdown-metadata-face :inherit 'fixed-pitch)))
  (when (display-graphic-p)
    (set-window-margins (selected-window) 2 2))
  (if (display-graphic-p)
      (when (fboundp 'mixed-pitch-mode)
        (mixed-pitch-mode 1))
    ;; In TUI, soften prose contrast while keeping code crisp.
    (face-remap-add-relative 'default :foreground "gray70")
    (face-remap-add-relative 'fixed-pitch :foreground "white")))

(defun gpe/reload ()
  "Reload the GnoponEmacs configuration."
  (interactive)
  (load-file user-init-file)
  (message "GnoponEmacs reloaded."))

(defun gpe/text-setup ()
  "Baseline text-mode setup for prose buffers."
  (visual-line-mode 1)
  (visual-fill-column-mode 1)
  (when (derived-mode-p 'markdown-mode)
    (gpe/markdown-heading-sizes)
    (gpe/markdown-frontmatter-setup)
    (whitespace-mode 1))
  (gpe/prose-visual-setup))
(add-hook 'text-mode-hook #'gpe/text-setup)

(defvar-local gpe/inactive-face-cookie nil
  "Cookie for inactive window face remapping in the current buffer.")

(defun gpe/apply-inactive-face (window)
  "Dim WINDOW when inactive."
  (with-current-buffer (window-buffer window)
    (if (eq window (selected-window))
        (when gpe/inactive-face-cookie
          (face-remap-remove-relative gpe/inactive-face-cookie)
          (setq gpe/inactive-face-cookie nil))
      (unless gpe/inactive-face-cookie
        (setq gpe/inactive-face-cookie
              (face-remap-add-relative 'default :inherit 'shadow))))))

(defun gpe/update-window-faces (&rest _)
  "Refresh dimming for inactive windows."
  (dolist (window (window-list))
    (gpe/apply-inactive-face window)))

(add-hook 'window-selection-change-functions #'gpe/update-window-faces)
(add-hook 'window-configuration-change-hook #'gpe/update-window-faces)
(add-hook 'buffer-list-update-hook #'gpe/update-window-faces)

;;;; Terminal (vterm)
(use-package vterm
  :commands vterm
  :init
  (defun gpe/vterm-toggle ()
    "Toggle a dedicated vterm buffer."
    (interactive)
    (let ((buf (get-buffer "*vterm*")))
      (if buf
          (if (eq (current-buffer) buf)
              (previous-buffer)
            (switch-to-buffer buf))
        (vterm))))
  :config
  (setq vterm-buffer-name "*vterm*"))

;;;; Python
(use-package envrc
  :init
  (envrc-global-mode))

(use-package python
  :straight nil
  :hook (python-mode . eglot-ensure)
  :init
  (setq python-shell-interpreter "python3"))

(use-package ruff-format
  :if (locate-library "ruff-format"))

(use-package blacken
  :commands (blacken-buffer blacken-mode)
  :init
  (setq blacken-line-length 88))

(use-package flymake-ruff
  :after python
  :hook (python-mode . flymake-ruff-load))

;;;; Projects / navigation (built-in-first)
(use-package project
  :straight nil
  :bind
  (:map gpe/project-map
        ("p" . project-switch-project)
        ("f" . project-find-file)
        ("b" . project-switch-to-buffer)
        ("k" . project-kill-buffers)
        ("d" . project-dired)
        ("c" . project-compile)))

(use-package ibuffer
  :straight nil
  :bind (("C-x C-b" . ibuffer)
         :map gpe/buffer-map
         ("i" . ibuffer)))

(use-package dired
  :straight nil
  :init
  (setq dired-dwim-target t
        dired-recursive-copies 'always
        dired-recursive-deletes 'top)
  :bind (:map gpe/file-map
              ("j" . dired-jump)))

;;;; Diagnostics (built-in-first): Flymake + optional Eglot
(use-package flymake
  :straight nil
  :hook (prog-mode . flymake-mode)
  :bind (:map gpe/diag-map
              ("n" . flymake-goto-next-error)
              ("p" . flymake-goto-prev-error)
              ("b" . flymake-show-buffer-diagnostics)))

;; Eglot is built into Emacs 29+, but can be installed on older versions.
(if (locate-library "eglot")
    (use-package eglot
      :straight nil
      :commands (eglot eglot-ensure)
      :bind (:map gpe/project-map
                  ("e" . eglot)
                  :map gpe/diag-map
                  ("a" . eglot-code-actions)))
  (use-package eglot
    :commands (eglot eglot-ensure)
    :bind (:map gpe/project-map
                ("e" . eglot)
                :map gpe/diag-map
                ("a" . eglot-code-actions))))

;;;; Help / introspection: Helpful (optional)
(use-package helpful
  :bind (("C-h f" . helpful-callable)
         ("C-h v" . helpful-variable)
         ("C-h k" . helpful-key)
         ("C-h x" . helpful-command)
         :map gpe/help-map
         ("." . helpful-at-point)))

;;;; Version control (built-in + optional Magit)
(use-package vc
  :straight nil
  :bind (:map gpe/vc-map
              ("d" . vc-dir)
              ("l" . vc-print-log)))

(use-package magit
  :commands (magit-status)
  :bind (:map gpe/vc-map
              ("s" . magit-status)))

(provide 'init)
;;; init.el ends here
