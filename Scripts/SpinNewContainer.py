#!/usr/bin/env python

from subprocess import call
import sys
import os
import crypt
import random

locker_location = "/lockers/containers/"
ip_file_location = locker_location+"Scripts/locker_ips.csv"
nginx_root = "/etc/nginx/"

if len(sys.argv) != 3 or sys.argv[1] == "help":
    print "Usage: spinNewLocker.py newLockerName password"
    sys.exit()
else:
    new_name = sys.argv[1]
    new_password = sys.argv[2]

if os.path.isdir(locker_location+new_name):
    sys.exit("Locker already exists")

print ">>    Creating new locker.."

call(["cp", "-r", locker_location+"newContainer", locker_location+new_name])
base = locker_location+new_name+"/"
call(["mv", base+"newContainer", base+new_name])
call(["mv", base+"newContainer.log", base+new_name+".log"])

print ">>    Initialisation.."

ip_file = open(ip_file_location, "a+")
ip_lines = ip_file.readlines()
last_line = ip_lines[-1]
last_ip = last_line.split(".")[3]
this_ip = int(last_ip.split("/")[0]) + 1
new_line = "10.0.0."+str(this_ip)+"/24,"+new_name+"\n"
ip_file.write(new_line)

print ">>    Writing fstab.."

inFile = open(base+"newContainer.fstab", "r")
outFile = open(base+new_name+".fstab", "w")
for line in inFile:
    line = line.replace("newContainer",new_name)
    outFile.write(line)
inFile.close()
outFile.close()

print ">>    Writing configuration.."

inFile = open(base+"newContainer.config", "r")
outFile = open(base+new_name+".config", "w")
for line in inFile:
    line = line.replace("newContainer",new_name)
    if line[0:16] == "lxc.network.ipv4":
      line = "lxc.network.ipv4 = 10.0.0."+str(this_ip)+"/24\n"
    outFile.write(line)
inFile.close()
outFile.close()

print ">>    Writing network configuration.."

call(["rm", base+new_name+"/etc/network/interfaces"])
net_file = open(base+new_name+"/etc/network/interfaces", "w")
config = ["auto eth0\n", "iface eth0 inet static\n",
          "  address 10.0.0."+str(this_ip)+"\n",
          "  netmask 255.255.255.0\n","  gateway 10.0.0.1\n"]
for line in config:
    net_file.write(line)
net_file.close()


locker_file = open(base+new_line+"/locker/Config/config.json", "r")
new_locker_file = open(base+new_line+"/locker/Config/new_config.json", "w")
for line in locker_file:
    if line[4:15] == "externalHost":
        line = '    "externalHost" : "'+new_name+'.locker.cam.ac.uk",'
    new_locker_file.write(line+'\n')
locker_file.close()
new_locker_file.close()
call(["mv", base+new_line+"/locker/Config/new_config.json", base+new_line+"/locker/Config/config.json"])
call(["rm", base+new_line+"/locker/Config/new_config.json"])


print ">>    Writing Hostname.."
call(["rm", base+new_name+"/etc/hostname"])
host_file = open(base+new_name+"/etc/hostname", "w")
host_file.write(new_name+"Locker")
host_file.close()

print ">>    Creating LXC.."

call(["lxc-create", "-n", new_name, "-f", base+new_name+".config"])

print ">>    Cleaning up locker temp files.."

call(["rm", base+"newContainer.fstab"])
call(["rm", base+"newContainer.config"])

print ">>    Generating password.."

letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
new_salt = random.choice(letters) + random.choice(letters)

pass_string = new_name+':'+crypt.crypt(new_password, new_salt)
pass_file = open('/srv/www/lockerroot/'+new_name+'.htpasswd', 'w')
pass_file.write(pass_string)
pass_file.close()

print ">>    Writing Nginx config.."

call(["mkdir", "-p", "/srv/www/lockerroot/"+new_name+"_logs"])

nginx_file = open(nginx_root+"sites-available/lockerrootnossl", "r")
new_site_file = open(nginx_root+"sites-available/"+new_name, "w")
for line in nginx_file:
    if line[4:15] == "server_name":
        line = "    server_name "+new_name+".locker.cam.ac.uk;\n"
    elif line[4:14] == "access_log":
        line = "    access_log /srv/www/lockerroot/"+new_name+"_logs/access.log;\n"
    elif line[4:13] == "error_log":
        line = "    error_log /srv/www/lockerroot/"+new_name+"_logs/error.log;\n"
    elif line[8:18] == "proxy_pass":
        line = "        proxy_pass http://10.0.0."+str(this_ip)+":8042;\n"
    elif line[8:28] == "auth_basic_user_file":
        line = '        auth_basic_user_file /srv/www/lockerroot/'+new_name+'.htpasswd;\n' 
    elif line[8:18] == "auth_basic":
        line = '        auth_basic "Welcome to '+new_name+'\'s locker.";\n'
    new_site_file.write(line)
nginx_file.close()
new_site_file.close()

call(["ln", "-s", nginx_root+"sites-available/"+new_name, nginx_root+"sites-enabled/"+new_name])

print ">>    Restarting Nginx.."

call(["/etc/init.d/nginx", "reload"])

print ">>    Staring LXC.."

call(["lxc-start", "-n", new_name, "-d", "--logfile="+base+new_name+".log"])

print ">>    Locker setup completed, Name:"+new_name+", IP: 10.0.0."+str(this_ip)+"/24"
call(["lxc-info", "-n", new_name])
call(["lxc-ls", "-l"])
print "=========================================="
print "Add DNS:, and SSH & start locker!"
print "lxc-start -n iml1 -d --logfile=/lockers/containers/"+new_name+"/"+new_name+".log "
print "./lockerBigStack > Logs/test.log 2>&1 &"
print new_name+"     A       193.60.91.222"
print "DONE!"