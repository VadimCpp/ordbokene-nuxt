import { useStore } from '~/stores/searchStore'


export default defineNuxtRouteMiddleware(async (to, from) => {
    //console.log("MIDDLEWARE\nFROM: ", from, "\nTO: ", to, "\nREDIRECTED FROM:",to.redirectedFrom)
    const store = useStore()
    
    if (!store.endpoint) {
        const get_concepts = async (server, env) => {

            await Promise.all([fetch(`https://${server}.uib.no/opal/${env}/bm/concepts.json`).then(r => r.json()), fetch(`https://${server}.uib.no/opal/${env}/nn/concepts.json`).then(r => r.json())]).then(response => {
             //await Promise.all([fetch(server == 'oda'? 'https://httpstat.us/404': `https://${server}.uib.no/opal/${env}/bm/concepts.json`).then(r => check_status(r)), fetch(`https://${server}.uib.no/opal/${env}/nn/concepts.json`).then(r => check_status(r))]).then(response => {
                console.log("RESPONSE", response)
            store.concepts_bm = response[0].concepts
            store.concepts_nn = response[1].concepts
            store.endpoint = `https://${server}.uib.no/opal/${env}/`
            console.log("ENDPOINT:", store.endpoint)
          
          }).catch(async err => {
            if (server == 'oda') {
              console.log("Fallback to odd.uib.no")
              await get_concepts('odd', env)
              }
              else {
                console.log("Uncaught")
          
              }
            })
          }

        const config = useRuntimeConfig()
        await get_concepts('oda', config.public.endpointEnv || 'dev')
    }


    if (to.params.slug) {
        // Articles
        if (/^[0-9]+$/.test(to.params.slug[0])) {
            store.view = 'article'
        }
        // Words
        else {
            //console.log("WORD")
            store.view = 'word'
            store.advanced = false
            store.searchUrl = to.fullPath
            store.q = to.params.slug[0]
            if (to.redirectedFrom && to.redirectedFrom.query.q != store.q) {
                //console.log("SETTING ORIGINAL INPUT")
                store.originalInput = to.redirectedFrom.query.q
            } else  {
                store.originalInput = ""
                store.input = store.q
            }
            

        }
    }
    else if (to.name == 'dict-search') {
        // Redirect old links to advanced search
        if (to.query.scope) {
            let url = `/search?q=${to.query.q}&dict=${to.params.dict}&scope=${to.query.scope}`
            if (to.query.pos) {
                url += "&pos=" + to.query.pos
            }

            return navigateTo(url)
        }
        else { // Simple search
            // Redirect to advanced
            if (specialSymbols(to.query.q)) {
                //console.log("REDIRECT TO ADVANCED")
                store.scope = "e"
                return navigateTo(`/${store.dict}/search?q=${to.query.q}&scope=${store.scope}`)
            }
            else {
                //console.log("SIMPLE SEARCH")
                store.advanced = false
                console.log("FETCHING SUGGESTIONS FROM ", `${store.endpoint}api/suggest?&q=${to.query.q}&dict=${to.params.dict}&n=20&dform=int&meta=n&include=eis`)
                const { pending, error, refresh, data: suggestions } = await useAsyncData(`suggest_${to.query.q}_${to.params.dict}`, () => $fetch(`${store.endpoint}api/suggest?&q=${to.query.q}&dict=${to.params.dict}&n=20&dform=int&meta=n&include=eis`))
                let { exact, inflect } = suggestions.value.a
        
                if (exact) {
                    if (exact[0][0].length == store.q.length) {
                        // kun hvis resultatet er et uttrykk eller har litt andre tegn?
                        //console.log("EXACT", exact[0][0])

                        return navigateTo(`/${store.dict}/${exact[0][0]}`)
                    }
                }
                if (inflect) {
                        //console.log("INFLECT", inflect[0][0])

                        return navigateTo(`/${store.dict}/${inflect[0][0]}`)
                    
                }

                //console.log("REDIRECT SUGGEST")
                return navigateTo(`/${store.dict}/suggest?q=${to.query.q}`)

            }
        }
    }
    else if (to.name == 'dict-suggest') {
        //console.log("SUGGEST")
        store.q = to.query.q
        store.input = to.query.q || ""
        store.originalInput = ""
        store.view = 'suggest'
        
        
    }
    else {
        store.q = ""
        store.input = ""
    }

})