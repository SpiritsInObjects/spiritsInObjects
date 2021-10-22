#!/bin/bash

DEPS=(
	pandoc
	./node_modules/.bin/showdown
)

for dep in "${DEPS[@]}"; do
	if ! command -v "${dep}" &> /dev/null
	then
	    echo "Application ${dep} could not be found"
	    echo "Please install ${dep} before running the manual script"
	    exit 1
	fi
done

YEAR=`date '+%Y'`
HTML="./docs/manual/index.html"

############
#
# BUILD HTML
#
############

tmp_file=`mktemp`
./node_modules/.bin/showdown makehtml -i ./docs/manual/README.md -o "${tmp_file}"

cat ./docs/manual/head.html.tmpl > "${HTML}" 
cat "${tmp_file}" >> "${HTML}"
echo "" >> "${HTML}"
echo "<footer><hr/ ><center>&copy; ${YEAR}</center></footer>" >> "${HTML}"
cat ./docs/manual/footer.html.tmpl >> "${HTML}"

rm "${tmp_file}"

############
#
# BUILD PDF
#
############

tmp_file=`mktemp`
tmp_md="${tmp_file}.md"

cat "./docs/manual/README.md" > "${tmp_md}"
echo "" >> "${tmp_md}"
echo "__________" >> "${tmp_md}"
echo "<center>&copy; ${YEAR}</center>" >> "${tmp_md}"

pandoc "${tmp_md}" -o ./docs/manual/spiritsInObjects-manual.pdf

rm -f "${tmp_md}"
rm -f "${tmp_file}"