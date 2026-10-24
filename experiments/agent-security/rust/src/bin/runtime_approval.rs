// Dummy operator observations and a worker admission/drain model. No host
// inspection, patch installation, container daemon, or exploit is involved.
#[derive(Clone, Copy)]
struct Inventory<'a> {
    worker_id: &'a str,
    boot_id: &'a str,
    image: &'a str,
    runtime_package: &'a str,
    kernel_package: &'a str,
    profile: &'a str,
    collected_at: u64,
}

struct Approval<'a> {
    image: &'a str,
    runtime_package: &'a str,
    kernel_package: &'a str,
    profile: &'a str,
    expires_at: u64,
    max_inventory_age: u64,
}

struct Worker<'a> {
    inventory: Inventory<'a>,
    accepting_jobs: bool,
    active_jobs: u32,
}

fn may_start(worker: &Worker<'_>, approval: &Approval<'_>, now: u64) -> bool {
    let observed = &worker.inventory;
    worker.accepting_jobs
        && !observed.worker_id.is_empty()
        && !observed.boot_id.is_empty()
        && now >= observed.collected_at
        && now - observed.collected_at <= approval.max_inventory_age
        && now < approval.expires_at
        && observed.image == approval.image
        && observed.runtime_package == approval.runtime_package
        && observed.kernel_package == approval.kernel_package
        && observed.profile == approval.profile
}

fn assign(worker: &mut Worker<'_>, approval: &Approval<'_>, now: u64) -> bool {
    if !may_start(worker, approval, now) {
        return false;
    }
    worker.active_jobs += 1;
    true
}

fn stop_assigning(worker: &mut Worker<'_>) {
    worker.accepting_jobs = false;
}

fn record_completion(worker: &mut Worker<'_>) {
    worker.active_jobs = worker.active_jobs.checked_sub(1).expect("no active job");
}

fn may_retire(worker: &Worker<'_>) -> bool {
    !worker.accepting_jobs && worker.active_jobs == 0
}

fn main() {
    let approval = Approval {
        image: "dummy-image-B",
        runtime_package: "distro-runc-reviewed-build-B",
        kernel_package: "distro-kernel-reviewed-build-K",
        profile: "isolated-job-v2",
        expires_at: 200,
        max_inventory_age: 20,
    };
    let approved = Inventory {
        worker_id: "worker-new",
        boot_id: "dummy-boot-new",
        image: approval.image,
        runtime_package: approval.runtime_package,
        kernel_package: approval.kernel_package,
        profile: approval.profile,
        collected_at: 100,
    };
    let mut old = Worker {
        inventory: Inventory {
            worker_id: "worker-old",
            boot_id: "dummy-boot-old",
            runtime_package: "distro-runc-old-build",
            ..approved
        },
        accepting_jobs: true,
        active_jobs: 2,
    };
    assert!(!assign(&mut old, &approval, 100));
    assert_eq!(old.active_jobs, 2);
    stop_assigning(&mut old);
    assert!(!may_retire(&old));
    record_completion(&mut old);
    record_completion(&mut old);
    assert!(may_retire(&old));

    let mut replacement = Worker {
        inventory: approved,
        accepting_jobs: true,
        active_jobs: 0,
    };
    assert!(assign(&mut replacement, &approval, 100));
    assert_eq!(replacement.active_jobs, 1);
    assert!(!may_start(&replacement, &approval, 121));
    assert!(!may_start(&replacement, &approval, 99));
    let fresh_but_expired = Worker {
        inventory: Inventory {
            collected_at: 200,
            ..approved
        },
        accepting_jobs: true,
        active_jobs: 0,
    };
    assert!(!may_start(&fresh_but_expired, &approval, 200));
    for inventory in [
        Inventory {
            image: "dummy-image-old",
            ..approved
        },
        Inventory {
            kernel_package: "distro-kernel-old-build",
            ..approved
        },
        Inventory {
            profile: "privileged",
            ..approved
        },
        Inventory {
            worker_id: "",
            ..approved
        },
        Inventory {
            boot_id: "",
            ..approved
        },
    ] {
        let changed = Worker {
            inventory,
            accepting_jobs: true,
            active_jobs: 0,
        };
        assert!(!may_start(&changed, &approval, 100));
    }
    stop_assigning(&mut replacement);
    assert!(!may_start(&replacement, &approval, 100));
    println!("Old runtime received zero new jobs; its two existing jobs drained before retirement. Replacement accepted one job. Changed image/kernel/profile, stale inventory, expired approval, and disabled admission were denied.");
}
