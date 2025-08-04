import React, { useState, useEffect } from 'react';
import IdfChart from '../components/IdfChart';
import londonCleanIdf from '../mock/london_clean_idf_2b.json';

const API_BASE = 'http://localhost:5000';

const ProjectWizard = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    location: '',
    projectType: '',
    foundationDepth: '',
    slope: '',
    drainage: '',
    soil: '',
    height: ''
  });
  const [enrichment, setEnrichment] = useState(null);
  const [status, setStatus] = useState('');

  // ✅ Fetch enrichment data automatically in Step 2
  useEffect(() => {
    if (step === 2 && form.location) {
      const [city = '', province = ''] = form.location.split(',').map(s => s.trim());
      console.log('🌍 Extracted city/province:', city, province);
      console.log('📡 Calling /api/enrich-location...');

      fetch(`${API_BASE}/api/enrich-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, province })
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.success && resData.data) {
            setEnrichment(resData.data);
            console.log('✅ Enrichment data set:', resData.data);

            // ✅ Log IDF data with durations in minutes
            if (resData.data.idf) {
              const idf = resData.data.idf;
              console.log('🧪 IDF durations in minutes:');
              Object.entries(idf).forEach(([rp, durations]) => {
                console.log(`${rp}:`, Object.keys(durations));
              });
            }

          } else {
            console.error('❌ Enrichment failed:', resData.message);
            setEnrichment(null);
          }
        })
        .catch(err => {
          console.error('❌ Enrichment fetch error:', err);
          setEnrichment(null);
        });
    }
  }, [step, form.location]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // ✅ Cleaned-up submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('⏳ Submitting...');
    console.log('📤 Submitting form:', form);
    console.log('📤 With enrichment:', enrichment);

    try {
      const res = await fetch(`${API_BASE}/api/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, enrichment })
      });
      const data = await res.json();
      console.log('📦 Server response:', data);
      if (data.success) {
        setStatus('✅ Submission saved!');
        downloadPDF();
      } else {
        setStatus('❌ Failed to save.');
      }
    } catch (err) {
      console.error('❌ Submission error:', err);
      setStatus('❌ Server error.');
    }
  };

  const downloadPDF = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, enrichment })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compliance_report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Failed to generate PDF:', err);
    }
  };

  const checkCompliance = () => {
    const results = [];
    if (enrichment?.frost_depth && parseFloat(form.foundationDepth) < enrichment.frost_depth) {
      results.push('❌ Foundation depth is below frost depth requirement.');
    } else {
      results.push('✅ Foundation depth meets frost requirement.');
    }

    if (enrichment?.setback_min) {
      results.push(`ℹ️ Min required setback: ${enrichment.setback_min} m`);
    }

    if (enrichment?.rainfall_10yr && form.drainage === 'swale') {
      results.push('⚠️ Swale may not be sufficient for heavy rainfall. Consider storm pipe.');
    }

    return results;
  };

  const useLondonTestOverride =
    form.location.toLowerCase().includes('london') &&
    enrichment?.station_id === '6144478_ON_LONDON_CS';

  const idfToUse = useLondonTestOverride
    ? londonCleanIdf
    : enrichment?.idf;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow rounded">
      <h1 style={{ color: 'green', textAlign: 'center' }}>🚧 Project Wizard Loaded! 🚧</h1>
      <h2 className="text-2xl font-bold mb-4">Project Setup ({step}/3)</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <>
            <input name="location" placeholder="Location (e.g. Montreal, Quebec)" value={form.location} onChange={handleChange} className="w-full border p-2" required />
            <select name="projectType" value={form.projectType} onChange={handleChange} className="w-full border p-2" required>
              <option value="">Select Project Type</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </>
        )}

        {step === 2 && (
          <>
            <input name="foundationDepth" type="number" placeholder="Foundation Depth (m)" value={form.foundationDepth} onChange={handleChange} className="w-full border p-2" required />
            <input name="slope" placeholder="Lot Slope (%) or Description" value={form.slope} onChange={handleChange} className="w-full border p-2" />
            <select name="drainage" value={form.drainage} onChange={handleChange} className="w-full border p-2" required>
              <option value="">Select Drainage Type</option>
              <option value="swale">Swale</option>
              <option value="storm_pipe">Storm Pipe</option>
              <option value="ditch">Ditch</option>
            </select>
            <input name="soil" placeholder="Soil Type (optional)" value={form.soil} onChange={handleChange} className="w-full border p-2" />
          </>
        )}

        {step === 3 && (
          <>
            <input name="height" placeholder="Building Height (storeys or m)" value={form.height} onChange={handleChange} className="w-full border p-2" required />

            <div className="bg-gray-50 p-4 border rounded mt-4">
              <h3 className="font-semibold mb-2">Review:</h3>
              <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(form, null, 2)}</pre>
            </div>

            {enrichment && (
              <>
                <pre className="text-xs text-gray-500">{JSON.stringify(enrichment, null, 2)}</pre>

                <div className="bg-green-50 border border-green-200 rounded p-4 mt-4">
                  <h3 className="font-semibold mb-2">Compliance Checks</h3>
                  <ul className="list-disc ml-5 text-sm space-y-1">
                    {checkCompliance().map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>

                {idfToUse && (
                  <div className="bg-yellow-50 p-4 mt-4 border rounded">
                    <h3 className="font-semibold mb-2">📈 IDF Curves</h3>
                    {console.log("🧪 IDF data passed to chart:", idfToUse)}
                    <IdfChart idf={idfToUse} />
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="flex justify-between pt-4">
          {step > 1 && <button type="button" onClick={prevStep} className="px-4 py-2 bg-gray-300">Back</button>}
          {step < 3 && <button type="button" onClick={nextStep} className="ml-auto px-4 py-2 bg-blue-600 text-white">Next</button>}
          {step === 3 && (
            <button
              type="submit"
              className="ml-auto px-4 py-2 bg-green-600 text-white"
              disabled={!enrichment}
            >
              Submit
            </button>
          )}
        </div>

        {status && <p className="text-center mt-4 text-sm text-green-600">{status}</p>}
      </form>
    </div>
  );
};

export default ProjectWizard;
