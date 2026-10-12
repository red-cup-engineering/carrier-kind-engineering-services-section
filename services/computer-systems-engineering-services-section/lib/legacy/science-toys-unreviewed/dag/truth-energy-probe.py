# ritm_truth_energy_probe_5pnoise.py
# RITM "energy law of truth" simulator with Kalman decoder,
# adjoint-canceling control, MI floor, and 5% noise window.

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from numpy.random import default_rng
from pathlib import Path

# ---------------------------------------------------------------
# Parameters and system definition
# ---------------------------------------------------------------
T = 800                    # total time steps (change as desired)
d, m, obs_d = 2, 2, 2
A = np.array([[0.90, 0.05],
              [-0.03, 0.92]])
B = np.array([[0.15, 0.00],
              [0.00, 0.12]])
H = np.eye(obs_d)

proc_sigma, obs_sigma = 0.06, 0.10
Q_base = (proc_sigma**2) * np.eye(d)
R_base = (obs_sigma**2) * np.eye(obs_d)

K_prev = np.array([[0.55, 0.10],
                   [-0.05, 0.45]])
K_info = np.array([[0.25, 0.00],
                   [0.00, 0.25]])

outdir = Path("ritm_outputs")
outdir.mkdir(exist_ok=True)

# ---------------------------------------------------------------
# Noise schedule: full noise for first 5% of steps, then taper off
# ---------------------------------------------------------------
def noise_scale(t, T_total, frac_on=0.05, frac_decay=0.05):
    """Return noise multiplier in [0,1]."""
    if t < frac_on * T_total:
        return 1.0
    elif t < (frac_on + frac_decay) * T_total:
        # linear decay from 1 -> 0 over next frac_decay portion
        return 1.0 - (t - frac_on*T_total) / (frac_decay*T_total)
    else:
        return 0.0

# ---------------------------------------------------------------
# Mutual information estimator
# ---------------------------------------------------------------
def mutual_information_hist(a, b, bins=16):
    a = a.reshape(-1, a.shape[-1]) if a.ndim > 1 else a.reshape(-1,1)
    b = b.reshape(-1, b.shape[-1]) if b.ndim > 1 else b.reshape(-1,1)
    a1, b1 = a[:,0], b[:,0]
    mask = np.isfinite(a1) & np.isfinite(b1)
    a1, b1 = a1[mask], b1[mask]
    if a1.size < 20:
        return np.nan
    H2, _, _ = np.histogram2d(a1, b1, bins=bins)
    pxy = H2 / np.sum(H2)
    px = np.sum(pxy, axis=1, keepdims=True)
    py = np.sum(pxy, axis=0, keepdims=True)
    eps = 1e-12
    pxy_safe, px_safe, py_safe = pxy + eps, px + eps, py + eps
    return float(np.sum(pxy_safe * (np.log(pxy_safe) - np.log(px_safe) - np.log(py_safe))))

# ---------------------------------------------------------------
# Kalman simulation
# ---------------------------------------------------------------
def kalman_run(policy="baseline", seed=0, iota0=0.8, alpha=0.15, kc=0.9):
    rng = default_rng(seed)
    x = np.zeros((T+1, d))
    y = np.zeros((T, obs_d))
    u = np.zeros((T, m))
    resid = np.zeros(T)
    xhat_f = np.zeros((T+1, d))
    xhat_p = np.zeros((T, d))
    P = np.eye(d) * 0.4

    for t in range(T):
        # ----- dynamic noise scaling -----
        s = noise_scale(t, T)
        Q_t = (s * proc_sigma)**2 * np.eye(d)
        R_t = (s * obs_sigma)**2 * np.eye(obs_d)

        # Observation (with scaled noise)
        y[t] = H @ x[t] + rng.multivariate_normal(np.zeros(obs_d), R_t)

        # Kalman predict/update
        xhat_p[t] = A @ xhat_f[t] + B @ u[t-1] if t>0 else A @ xhat_f[t]
        P = A @ P @ A.T + Q_t
        v = y[t] - H @ xhat_p[t]
        S = H @ P @ H.T + R_t + 1e-9*np.eye(obs_d)
        K_gain = P @ H.T @ np.linalg.inv(S)
        xhat_f[t+1] = xhat_p[t] + K_gain @ v
        P = (np.eye(d) - K_gain @ H) @ P
        resid[t] = np.linalg.norm(v)

        # Control laws
        if policy == "baseline":
            u_t = np.zeros(m)
        elif policy == "previous":
            u_t = (K_prev @ y[t].reshape(-1,1)).ravel()
        elif policy == "adjoint":
            r_pred = A @ xhat_f[t+1]
            u_t = (-kc) * (B.T @ r_pred)
            # MI floor blend
            if t > 10:
                mi_est = mutual_information_hist(u[:t], xhat_f[1:t+1])
                if np.isfinite(mi_est) and mi_est < iota0:
                    lam = (iota0 - mi_est) / iota0
                    lam = np.clip(lam, 0, 1)
                    u_t += lam * alpha * (K_info @ xhat_f[t+1])
        else:
            raise ValueError("Unknown policy")

        u[t] = u_t
        # Advance true system with scaled process noise
        w = rng.multivariate_normal(np.zeros(d), Q_t)
        x[t+1] = A @ x[t] + B @ u_t + w

    mi_u_xhat = mutual_information_hist(u, xhat_f[:-1])
    mi_y_x = mutual_information_hist(y, x[:-1])
    num = np.linalg.norm(x[1:] - x[:-1], axis=1)
    den = np.linalg.norm(u, axis=1)
    mask = den > 1e-8
    gain = float(np.max(num[mask] / den[mask])) if np.any(mask) else 0.0
    E_resid = float(np.mean(resid**2))
    var_x = float(np.var(x, axis=0).mean())

    return dict(x=x, y=y, u=u, resid=resid, xhat_f=xhat_f, xhat_p=xhat_p,
                MI_u_xhat=mi_u_xhat, MI_y_x=mi_y_x,
                gain=gain, E_resid=E_resid, var_x=var_x)

# ---------------------------------------------------------------
# Run and collect metrics
# ---------------------------------------------------------------
out_base = kalman_run("baseline", seed=3)
out_prev = kalman_run("previous", seed=3)
out_adj  = kalman_run("adjoint",  seed=3, iota0=0.9, alpha=0.2, kc=1.0)

metrics = pd.DataFrame([
    {"scenario":"baseline",
     "state_variance": out_base["var_x"],
     "residual_energy": out_base["E_resid"],
     "closed_loop_gain": out_base["gain"],
     "MI(u;xhat)": out_base["MI_u_xhat"],
     "MI(y;x)": out_base["MI_y_x"]},
    {"scenario":"bounded_feedback(prev)",
     "state_variance": out_prev["var_x"],
     "residual_energy": out_prev["E_resid"],
     "closed_loop_gain": out_prev["gain"],
     "MI(u;xhat)": out_prev["MI_u_xhat"],
     "MI(y;x)": out_prev["MI_y_x"]},
    {"scenario":"adjoint_cancel + MI floor",
     "state_variance": out_adj["var_x"],
     "residual_energy": out_adj["E_resid"],
     "closed_loop_gain": out_adj["gain"],
     "MI(u;xhat)": out_adj["MI_u_xhat"],
     "MI(y;x)": out_adj["MI_y_x"]},
])
metrics.to_csv(outdir / "ritm_v3_metrics.csv", index=False)
print("\nSaved metrics to:", outdir / "ritm_v3_metrics.csv")
print(metrics)

# ---------------------------------------------------------------
# Plot residual proxies
# ---------------------------------------------------------------
plt.figure()
plt.plot(out_base["resid"], label="baseline")
plt.plot(out_prev["resid"], label="bounded_feedback(prev)")
plt.plot(out_adj["resid"], label="adjoint_cancel + MI floor")
plt.xlabel("time step")
plt.ylabel("innovation norm (KF residual proxy)")
plt.title("Kalman residual proxy over time (5% noise window)")
plt.legend()
plt.tight_layout()
plt.savefig(outdir / "ritm_v3_residuals.png", dpi=150)
plt.show()

# ---------------------------------------------------------------
# Plot control magnitudes
# ---------------------------------------------------------------
plt.figure()
plt.plot(np.linalg.norm(out_prev["u"], axis=1), label="||u|| prev")
plt.plot(np.linalg.norm(out_adj["u"], axis=1), label="||u|| adjoint+MI")
plt.xlabel("time step")
plt.ylabel("control magnitude ||u_t||")
plt.title("Control magnitude over time (5% noise window)")
plt.legend()
plt.tight_layout()
plt.savefig(outdir / "ritm_v3_controls.png", dpi=150)
plt.show()


# ---------------------------------------------------------------
# Truth-energy and intelligibility diagnostics
# ---------------------------------------------------------------
def rolling_mi(u_hist, xhat_hist, window=50):
    """Approximate mutual information over a rolling window."""
    mi_vals = np.zeros(len(u_hist))
    for t in range(window, len(u_hist)):
        mi_vals[t] = mutual_information_hist(u_hist[t-window:t], xhat_hist[t-window:t])
    return mi_vals

def truth_energy(x, u, A, B):
    """Compute residual curvature and energy at each step."""
    rho = x[1:] - (A @ x[:-1].T).T - (B @ u.T).T
    E = 0.5 * np.sum(rho**2, axis=1)
    return rho, E

# pick one run to inspect (adjoint controller is the interesting one)
x, u = out_adj["x"], out_adj["u"]
xhat = out_adj["xhat_f"]

# compute per-step quantities
rho, E_t = truth_energy(x, u, A, B)
I_t = rolling_mi(u, xhat)

# smooth for readability
E_smooth = pd.Series(E_t).rolling(10, min_periods=1).mean()
I_smooth = pd.Series(I_t).rolling(10, min_periods=1).mean()

# ---- plot truth-energy decay
plt.figure()
plt.plot(E_smooth, label="Truth-energy ½||ρ||²")
plt.xlabel("time step")
plt.ylabel("energy")
plt.title("Truth-energy decay over time")
plt.legend()
plt.tight_layout()
plt.savefig(outdir / "ritm_truth_energy.png", dpi=150)
plt.show()

# ---- plot intelligibility
plt.figure()
plt.plot(I_smooth, label="Mutual information I(u;x̂)")
plt.xlabel("time step")
plt.ylabel("approx. MI")
plt.title("Intelligibility over time")
plt.legend()
plt.tight_layout()
plt.savefig(outdir / "ritm_intelligibility.png", dpi=150)
plt.show()

# ---- coupled field plot: E_t vs I_t
plt.figure()
plt.plot(I_smooth, E_smooth, color="purple")
plt.xlabel("Intelligibility I(u;x̂)")
plt.ylabel("Truth-energy ½||ρ||²")
plt.title("RITM coupling: energy vs intelligibility")
plt.tight_layout()
plt.savefig(outdir / "ritm_coupling.png", dpi=150)
plt.show()

print("\nPlots saved in:", outdir.resolve())

# ---------------------------------------------------------------
# Dual-Wave Relational Breath with Living Central Pulse Column
# ---------------------------------------------------------------
import matplotlib.animation as animation
from matplotlib.animation import PillowWriter
import matplotlib.cm as cm

fig, ax = plt.subplots(figsize=(7,4))
fig.patch.set_facecolor("black")
ax.set_facecolor("black")
ax.set_title("Relational Breath: Field ↔ Agent", color="white", pad=10)
ax.set_xlabel("time step", color="white")
ax.set_ylabel("energy exchange", color="white")
ax.tick_params(colors="white")
ax.axhline(0, color="gray", lw=0.8, alpha=0.4)

# --- normalised data ---
E_agent = E_smooth / np.max(E_smooth)
E_field = 1 - E_agent
t = np.arange(len(E_agent))
amplitude = (E_field - E_agent)
amplitude /= np.max(np.abs(amplitude))
colors = cm.cool((amplitude + 1)/2)

# --- elements ---
field_line, = ax.plot([], [], lw=2, color="deepskyblue", label="Field")
agent_line, = ax.plot([], [], lw=2, color="magenta", label="Agent")
pulse_line = ax.axvline(0, color="white", lw=3, alpha=0.0)     # central pulse
ax.legend(facecolor="black", framealpha=0.3, labelcolor="white", loc="upper right")
ax.set_xlim(0, len(t))
ax.set_ylim(-1.1, 1.1)

def init():
    field_line.set_data([], [])
    agent_line.set_data([], [])
    pulse_line.set_alpha(0.0)
    return field_line, agent_line, pulse_line

def update(i):
    # main waves
    x = t[:i]
    y_field = amplitude[:i] * 0.8
    y_agent = -y_field
    field_line.set_data(x, y_field)
    agent_line.set_data(x, y_agent)

    # pulse column through the centre of the graph
    pulse_line.set_xdata(i)
    # brightness of the pulse follows absolute amplitude (stronger exchange → brighter)
    pulse_alpha = 0.05 + 0.8 * abs(amplitude[i])
    pulse_line.set_alpha(pulse_alpha)

    # wave colour by current phase
    c = colors[i]
    field_line.set_color(c)
    agent_line.set_color(c)

    return field_line, agent_line, pulse_line

ani = animation.FuncAnimation(
    fig, update, frames=len(t),
    init_func=init, interval=40, blit=True
)

gif_path = outdir / "ritm_dual_breath_pulsecolumn.gif"
ani.save(gif_path)
plt.close(fig)
print(f"Saved dual-wave + vertical pulse animation → {gif_path}")
