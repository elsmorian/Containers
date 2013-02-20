TARGETS = mountkernfs.sh mountdevsubfs.sh networking ifupdown ifupdown-clean mountall.sh mountoverflowtmp urandom mountnfs.sh mountnfs-bootclean.sh hostname.sh checkfs.sh checkroot.sh mtab.sh mountall-bootclean.sh procps bootlogd stop-bootlogd-single bootmisc.sh x11-common
INTERACTIVE = checkfs.sh checkroot.sh
mountdevsubfs.sh: mountkernfs.sh
networking: mountkernfs.sh mountall.sh mountoverflowtmp ifupdown
ifupdown: ifupdown-clean
ifupdown-clean: checkroot.sh
mountall.sh: checkfs.sh
mountoverflowtmp: mountall-bootclean.sh
urandom: mountall.sh mountoverflowtmp
mountnfs.sh: mountall.sh mountoverflowtmp networking ifupdown
mountnfs-bootclean.sh: mountall.sh mountoverflowtmp mountnfs.sh
hostname.sh: bootlogd
checkfs.sh: checkroot.sh mtab.sh
checkroot.sh: mountdevsubfs.sh hostname.sh bootlogd
mtab.sh: checkroot.sh
mountall-bootclean.sh: mountall.sh
procps: mountkernfs.sh mountall.sh mountoverflowtmp bootlogd
bootlogd: mountdevsubfs.sh
stop-bootlogd-single: mountall.sh mountoverflowtmp networking ifupdown ifupdown-clean urandom mountnfs.sh mountnfs-bootclean.sh mountkernfs.sh hostname.sh checkfs.sh checkroot.sh mtab.sh mountall-bootclean.sh procps mountdevsubfs.sh bootlogd bootmisc.sh x11-common
bootmisc.sh: mountall.sh mountoverflowtmp mountnfs.sh mountnfs-bootclean.sh
x11-common: mountall.sh mountoverflowtmp
