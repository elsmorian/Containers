��    F      L  a   |         o     ?   q  �   �  .   H  #   w     �  '   �     �     �            (   *     S  K   j     �     �     �  -   �     	     	     $	  Q   2	     �	  8   �	  M   �	  k   "
  8   �
  (   �
     �
     �
  u        �     �  X   �  @   �     .  ;   K  6   �  7   �  �   �  /     4   �  =   �  Y   "  �  |  )   @  7   j     �  1   �  '   �  .     C   J     �  �   �     )     /  n   O     �  @   �       &   5     \     _  '   q     �  !   �     �  a   �     R  u  V  s   �  D   @  �   �  1   ;  "   m     �  ,   �     �  !   �            2   ,      _  Y   �     �  %   �       C        X     k     s  ^   �     �  ?   �  j   9  m   �  F     4   Y     �  (   �  �   �     Q     Z  q   b  O   �  -   $  H   R  C   �  >   �  �     =   �  =   �  ;   ;  i   w  (  �  7   
"  :   B"     }"  9   �"  .   �"  4   #  M   9#     �#  �   �#     =$  !   E$  �   g$     �$  R   %     `%  B   x%     �%     �%  '   �%  "   �%     &  !   7&  g   Y&     �&        4       '       A                    =                       0      +                !   >       *                  (       3   <   ,   :                 7   /   ;   F               -      D   .   B           8   @   1                               2   $          C             9      %      6          "           #   )   
      E      	   5   ?   &    
        --outdated		Merge in even outdated translations.
	--drop-old-templates	Drop entire outdated templates. 
  -o,  --owner=package		Set the package that owns the command.   -f,  --frontend		Specify debconf frontend to use.
  -p,  --priority		Specify minimum priority question to show.
       --terse			Enable terse mode.
 %s failed to preconfigure, with exit status %s %s is broken or not fully installed %s is fuzzy at byte %s: %s %s is fuzzy at byte %s: %s; dropping it %s is missing %s is missing; dropping %s %s is not installed %s is outdated %s is outdated; dropping whole template! %s must be run as root (Enter zero or more items separated by a comma followed by a space (', ').) Back Cannot read status file: %s Choices Config database not specified in config file. Configuring %s Debconf Debconf on %s Debconf was not configured to display this error message, so it mailed it to you. Debconf, running at %s Dialog frontend is incompatible with emacs shell buffers Dialog frontend requires a screen at least 13 lines tall and 31 columns wide. Dialog frontend will not work on a dumb terminal, an emacs shell buffer, or without a controlling terminal. Enter the items you want to select, separated by spaces. Extracting templates from packages: %d%% Help Ignoring invalid priority "%s" Input value, "%s" not found in C choices! This should never happen. Perhaps the templates were incorrectly localized. More Next No usable dialog-like program is installed, so the dialog based frontend cannot be used. Note: Debconf is running in web mode. Go to http://localhost:%i/ Preconfiguring packages ...
 Problem setting up the database defined by stanza %s of %s. TERM is not set, so the dialog frontend is not usable. Template #%s in %s does not contain a 'Template:' line
 Template #%s in %s has a duplicate field "%s" with new value "%s". Probably two templates are not properly separated by a lone newline.
 Template database not specified in config file. Template parse error near `%s', in stanza #%s of %s
 Term::ReadLine::GNU is incompatable with emacs shell buffers. The Sigils and Smileys options in the config file are no longer used. Please remove them. The editor-based debconf frontend presents you with one or more text files to edit. This is one such text file. If you are familiar with standard unix configuration files, this file will look familiar to you -- it contains comments interspersed with configuration items. Edit the file, changing any items as necessary, and then save it and exit. At that point, debconf will read the edited file, and use the values you entered to configure the system. This frontend requires a controlling tty. Unable to load Debconf::Element::%s. Failed because: %s Unable to start a frontend: %s Unknown template field '%s', in stanza #%s of %s
 Usage: debconf [options] command [args] Usage: debconf-communicate [options] [package] Usage: debconf-mergetemplate [options] [templates.ll ...] templates Valid priorities are: %s You are using the editor-based debconf frontend to configure your system. See the end of this document for detailed instructions. _Help apt-extracttemplates failed: %s debconf-mergetemplate: This utility is deprecated. You should switch to using po-debconf's po2debconf program. debconf: can't chmod: %s delaying package configuration, since apt-utils is not installed falling back to frontend: %s must specify some debs to preconfigure no none of the above please specify a package to reconfigure template parse error: %s unable to initialize frontend: %s unable to re-open stdin: %s warning: possible database corruption. Will attempt to repair by adding back missing question %s. yes Project-Id-Version: debconf
Report-Msgid-Bugs-To: 
POT-Creation-Date: 2010-07-11 12:57+0100
PO-Revision-Date: 2006-01-28 03:04+0800
Last-Translator: Eric Pareja <xenos@upm.edu.ph>
Language-Team: Tagalog <debian-tl@banwa.upm.edu.ph>
Language: tl
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit
Plural-Forms: nplurals=2; plural=n>1;
 
        --outdated		Isama pati ang laos na pagsasalin.
	--drop-old-templates	Kalimutan ang buong template na laos. 
  -o,  --owner=pakete		Itakda ang pakete na may-ari ng utos na ito.   -f,  --frontend		Itakda ang mukha na gagamitin ng debconf.
  -p,  --priority		Itakda ang pinakamababang antas ng tanong na ipapakita.
       --terse			Gamitin ang modong tuwiran.
 bigo ang pagsasaayos ng %s, may exit status na %s %s ay sira o hindi buong nailuklok %s ay malabo sa byte %s: %s %s ay malabo sa byte %s: %s; hindi gagamitin Wala ang %s Wala ang %s; hindi ginamit ang %s %s ay hindi nakaluklok %s ay laos na %s ay laos na; hindi gagamitin ang buong template! %s ay dapat ipatakbo bilang root (Magbigay ng wala o labis na mga aytem na hiniwalay ng kuwit at sundan ng puwang (', ').) Bumalik Hindi mabasa ang talaksang status: %s Pagpipilian Hindi nakatakda ang database ng pagsasaayos sa taklasang pagkaayos. Isinasaayos ang %s Debconf Debconf sa %s Hindi nakasaayos ang debconf upang ipakita ang error, kaya't ito'y ipinadala sa inyo sa email. Debconf, pinatakbo sa %s Hindi maaring gamitin ang mukha na dialog sa emacs shell buffer Ang mukha na dialog ay nangangailangan ng tabing na di kukulang sa 13 linya kataas at 31 hilera ang lapad. Hindi gagana ang mukha na dialog sa dumb terminal, sa emacs shell buffer, o kung walang controlling terminal. Ibigay ang mga aytem na nais niyong piliin, nakahiwalay ng mga puwang. Binubuklat ang mga template mula sa mga pakete: %d%% Tulong Hindi pinansin ang imbalidong antas "%s" Ibinigay na halaga, "%s" hindi nahanap sa mga pagpipilian! Hindi ito dapat mangyari. Maaaring ang mga template ay hindi akma ang pagka-lokalisado. Meron pa Susunod Walang magamit na programang katulad ng dialog na naka-instol, kaya't hindi magamit ang mukha na batay sa dialog. Paunawa: Ang debconf ay tumatakbo sa modang web. Tignan sa http://localhost:%i/ Isinasaayos ang mga pakete bago luklokin ...
 Nagka-problema sa paghanda ng database na tinutukoy ng estropa %s ng %s. Hindi nakatakda ang TERM, kaya't hindi magamit ang mukha na dialog. Template #%s sa %s ay hindi naglalaman ng linyang 'Template:'
 Ang template #%s sa %s ay may nadobleng field "%s" na may bagong halagang "%s". Maaring ang dalawang template ay hindi nahiwalay ng tugma na mag-isang newline.
 Hindi nakatakda ang template database sa taklasang pagkaayos. Parse error sa template malapit sa `%s' sa estropa #%s ng %s
 Term::ReadLine::GNU ay hindi kabagay sa emacs shell buffer. Ang mga opsyon ng Sigil at Smiley sa talaksang pagkaayos ay hindi na ginagamit. Paki-tanggal ang mga ito. Ang mukha ng debconf na editor-based ay nagpi-prisinta ng ilang mga taklasang teksto na inyong ie-edit. Ito ay halimbawa ng ganoong taklasang teksto. Kung kayo'y pamilyar sa taklasang pagsasaayos na karaniwan sa unix, itong taklasan ay makikilala ninyo -- naglalaman ito ng mga komento na may kahalong mga aytem ng pagsasaayos. Iedit ang taklasan, baguhin ang mga aytem na kailangan, imbakin ang taklasan at lumabas. Sa puntong iyon, babasahin ng debconf ang na-edit na taklasan, at gagamitin ang mga halagang inyong pinasok upang masaayos ang sistema. Ang mukha na ito ay nangangailangan ng controlling tty. Hindi maipasok ang Debconf::Element::%s. Bigo dahil sa: %s Hindi mapatakbo ang mukha: %s Hindi kilalang template field '%s', sa estropa #%s ng %s
 Pag-gamit: debconf [mga opsyon] utos [mga arg] Pag-gamit: debconf-communicate [mga opsyon] [pakete] Pag-gamit: debconf-mergetemplate [mga opsyon] [templates.|| ...] mga template Mga tanggap na mga antas ay: %s Gumagamit kayo ng mukha ng debconf na editor-based upang isaayos ang inyong sistema. Basahin ang sukdulan ng babasahin para sa detalyadong mga bilin. _Tulong bigo ang apt-extracttemplates: %s debconf-mergetemplate: Ang kasangkapan na ito ay hindi na ginagamit.     Gamitin niyo na lamang ang po2debconf na programa ng po-debconf. debconf: hindi ma-chmod: %s ipinagpapaliban ang pagsasaayos ng pakete, dahil ang apt-utils ay hindi nakaluklok nanumbalik sa mukha: %s kailangan magtakda ng ilang mga deb na isasaayos bago ng pagluklok hindi wala sa itaas paki-takda ang pakete na isasaayos muli error sa pag-parse ng template: %s hindi maihanda ang mukha: %s hindi mabuksan muli ang stdin: %s babala: maaring nasira ang database. Susubukan itong ayusin sa pag-dagdag muli ng nawawalang tanong %s. oo 